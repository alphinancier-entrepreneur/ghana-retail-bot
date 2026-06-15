const express = require("express");
const {
  validateTwilioWebhook,
  createMessagingResponse,
  buildWebhookUrl,
} = require("../services/twilio");
const { parseRetailerMessage, parseBulkInventoryMessage } = require("../services/claude");
const { executeAction } = require("../handlers/executeAction");
const { executeBulkAdd } = require("../handlers/bulkInventory");
const { getOrCreateRetailer } = require("../services/retailer");
const { getSession } = require("../services/session");
const {
  isGreeting,
  resolveMenuPayload,
  handleMenuAction,
  handleGreeting,
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
      await deliverReply(res, { body: waitlistResult.text });
      return;
    }

    const twilioGate = await checkTwilioCapGate();
    if (twilioGate.blocked) {
      await deliverReply(res, { body: voice.rateLimitError() });
      return;
    }

    const reply = createReplySender(res, twilioGate);

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

    if (!body) {
      await reply(voice.helpMessage());
      return;
    }

    if (isGreeting(body)) {
      const result = await handleGreeting(from);
      await reply(result.text);
      return;
    }

    const menuPayload = resolveMenuPayload(body);
    if (menuPayload) {
      const menuResult = await handleMenuAction(menuPayload, from);
      if (menuResult) {
        await reply(menuResult.text);
        return;
      }
    }

    const retailer = await getOrCreateRetailer(from);
    const session = await getSession(retailer.id);

    if (session.mode === "awaiting_bulk_inventory") {
      const bulk = await parseBulkInventoryMessage(body);
      const result = await executeBulkAdd(bulk.items, from);
      await reply(result.text);
      return;
    }

    const parsed = await parseRetailerMessage(body);
    const result = await executeAction(parsed, from);
    await reply(result.text);
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
      await deliverReply(res, { body: text });
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
