const express = require("express");
const {
  validateTwilioWebhook,
  createMessagingResponse,
  buildWebhookUrl,
} = require("../services/twilio");
const { parseRetailerMessage, parseBulkInventoryMessage } = require("../services/claude");
const { executeAction } = require("../handlers/executeAction");
const { executeBulkAdd } = require("../handlers/bulkInventory");
const { getOrCreateRetailer, setRetailerName, normalizeWhatsAppPhone } = require("../services/retailer");
const { getSession, setSessionMode } = require("../services/session");
const { composeReply } = require("../services/voiceWriter");
const {
  isDeleteAccountIntent,
  isDeleteConfirm,
  isDeleteCancel,
  beginAccountDeletion,
  finishAccountDeletion,
  cancelAccountDeletion,
  abandonAccountDeletion,
} = require("../handlers/accountDelete");
const {
  isGreeting,
  isThanks,
  resolveMenuPayload,
  handleMenuAction,
} = require("../handlers/menu");
const {
  applyUsageGate,
  confirmLimitNoticeSent,
  handleWaitlist,
  isWaitlistKeyword,
} = require("../handlers/usageGate");
const {
  deliverReply,
  checkTwilioCapGate,
  createReplySender,
  isTwilioRateLimitError,
} = require("../services/twilioSend");
const { claimMessage } = require("../services/webhookDedup");
const { maskPhone } = require("../utils/logSafe");
const voice = require("../copy/shop-voice");

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

/**
 * Resolve a normal (non-onboarding) message into a reply result
 * ({ text, event? }). Numbers/templates are produced here; the caller runs it
 * through composeReply so Mariam's voice (or the template fallback) is applied.
 */
async function handleConversation({ body, from, retailer, session }) {
  if (!body) {
    return { text: voice.helpMessage() };
  }

  if (isThanks(body)) {
    return { text: voice.thankYou(), event: { kind: "thanks", mode: "full", facts: {} } };
  }

  if (isGreeting(body)) {
    return {
      text: voice.returningGreeting(),
      event: {
        kind: "returning_greeting",
        mode: "full",
        facts: { shopName: retailer?.name || null },
      },
    };
  }

  const menuPayload = resolveMenuPayload(body);
  if (menuPayload) {
    const menuResult = await handleMenuAction(menuPayload, from);
    if (menuResult) {
      return menuResult;
    }
  }

  if (session.mode === "awaiting_bulk_inventory") {
    const bulk = await parseBulkInventoryMessage(body);
    return executeBulkAdd(bulk.items, from);
  }

  const parsed = await parseRetailerMessage(body);
  return executeAction(parsed, from);
}

router.post("/whatsapp", async (req, res) => {
  if (!validateTwilioWebhook(req)) {
    console.warn(
      "Rejected webhook: invalid Twilio signature. URL used for check:",
      buildWebhookUrl(req),
      "— set PUBLIC_WEBHOOK_BASE_URL to https://ghana-retail-bot.onrender.com (no /webhook path)"
    );
    return res.status(403).send("Forbidden");
  }

  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();
  const messageSid = req.body.MessageSid || "";

  if (isProduction) {
    console.log(`WhatsApp from ${maskPhone(from)} (${body.length} chars)`);
  } else {
    console.log(`WhatsApp from ${from}: ${body}`);
  }

  try {
    const claim = await claimMessage(messageSid, from);
    if (claim.duplicate) {
      if (!isProduction) {
        console.log(`Duplicate webhook skipped: ${messageSid}`);
      }
      const twiml = createMessagingResponse();
      res.type("text/xml");
      res.send(twiml.toString());
      return;
    }

    if (body && isWaitlistKeyword(body)) {
      const waitlistResult = await handleWaitlist(from);
      await deliverReply(res, { body: waitlistResult.text, messageSid });
      return;
    }

    const twilioGate = await checkTwilioCapGate();
    if (twilioGate.blocked) {
      await deliverReply(res, { body: voice.rateLimitError(), messageSid });
      return;
    }

    const sendReply = createReplySender(res, twilioGate, messageSid);
    let deletedConfirmAbandoned = false;
    const reply = async (text) => {
      const message = deletedConfirmAbandoned
        ? `Deletion cancelled.\n\n${text}`
        : text;
      if (deletedConfirmAbandoned) deletedConfirmAbandoned = false;
      return sendReply(message);
    };

    const retailer = await getOrCreateRetailer(from);
    let session = await getSession(retailer.id);
    const phone = normalizeWhatsAppPhone(from);

    // Account deletion confirm — always allowed (before usage gate).
    if (session.mode === "awaiting_account_delete_confirm") {
      if (isDeleteConfirm(body)) {
        const result = await finishAccountDeletion(retailer.id, phone);
        await reply(result.text);
        return;
      }
      if (isDeleteCancel(body)) {
        const result = await cancelAccountDeletion(retailer.id);
        await reply(result.text);
        return;
      }
      deletedConfirmAbandoned = true;
      await abandonAccountDeletion(retailer.id);
      session = await getSession(retailer.id);
    }

    // Start account deletion — ask for DELETE before doing anything.
    if (!retailer.isNew && isDeleteAccountIntent(body)) {
      const result = await beginAccountDeletion(retailer.id);
      await reply(result.text);
      return;
    }

    // First-ever message: greet + ask name, or run the command then ask name.
    if (retailer.isNew) {
      if (!body || isGreeting(body)) {
        await setSessionMode(retailer.id, "awaiting_shop_name");
        await reply(voice.welcomeMessage());
        return;
      }

      const result = await handleConversation({ body, from, retailer, session });
      const message = await composeReply(result);
      await setSessionMode(retailer.id, "awaiting_shop_name");
      await reply(`${message}\n\n${voice.askShopName()}`);
      return;
    }

    // We previously asked for the shop name; capture this reply as the name.
    if (session.mode === "awaiting_shop_name") {
      await setSessionMode(retailer.id, "idle");
      if (!body || /^skip$/i.test(body)) {
        await reply(voice.shopNameSkipped());
        return;
      }
      await setRetailerName(retailer.id, body);
      const result = {
        text: voice.shopNameSaved({ shopName: body }),
        event: {
          kind: "shop_name_saved",
          mode: "full",
          facts: { shopName: body.trim().slice(0, 60) },
        },
      };
      await reply(await composeReply(result));
      return;
    }

    const usage = await applyUsageGate(from);
    if (!usage.proceed) {
      if (usage.text) {
        const sent = await reply(usage.text);
        if (sent.ok) {
          await confirmLimitNoticeSent(usage);
        }
      } else {
        const twiml = createMessagingResponse();
        res.type("text/xml");
        res.send(twiml.toString());
      }
      return;
    }

    const result = await handleConversation({ body, from, retailer, session });
    const text = result.templateOnly ? result.text : await composeReply(result);
    await reply(text);
  } catch (err) {
    const detail = err?.error?.message || err.message;
    console.error("Handler error:", detail);
    if (!isProduction) {
      console.error(err);
    }

    const text = isTwilioRateLimitError(err)
      ? voice.rateLimitError()
      : voice.handlerError();

    try {
      await deliverReply(res, { body: text, messageSid });
    } catch (sendErr) {
      console.error("Could not deliver error reply:", sendErr.message);
      const twiml = createMessagingResponse();
      twiml.message(text);
      res.type("text/xml");
      res.send(twiml.toString());
    }
  }
});

module.exports = router;
