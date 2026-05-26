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
  handleWaitlist,
  isWaitlistKeyword,
} = require("../handlers/usageGate");
const voice = require("../copy/shop-voice");

const router = express.Router();

function sendTwiML(res, twiml) {
  res.type("text/xml");
  res.send(twiml.toString());
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

  console.log(`WhatsApp from ${from}: ${body}`);

  const twiml = createMessagingResponse();

  try {
    // --- WAITLIST: always works, does not count toward daily limit ---
    if (body && isWaitlistKeyword(body)) {
      const waitlistResult = await handleWaitlist(from);
      twiml.message(waitlistResult.text);
      return sendTwiML(res, twiml);
    }

    // --- Daily usage limit (free tier) — admins/testers in UNLIMITED_USERS skip ---
    const usage = await applyUsageGate(from);
    if (!usage.proceed) {
      if (usage.text) {
        twiml.message(usage.text);
      }
      return sendTwiML(res, twiml);
    }

    if (!body) {
      twiml.message(voice.helpMessage());
      return sendTwiML(res, twiml);
    }

    if (isGreeting(body)) {
      const result = await handleGreeting(from);
      twiml.message(result.text);
      return sendTwiML(res, twiml);
    }

    const menuPayload = resolveMenuPayload(body);
    if (menuPayload) {
      const menuResult = await handleMenuAction(menuPayload, from);
      if (menuResult) {
        twiml.message(menuResult.text);
        return sendTwiML(res, twiml);
      }
    }

    const retailer = await getOrCreateRetailer(from);
    const session = await getSession(retailer.id);

    if (session.mode === "awaiting_bulk_inventory") {
      const bulk = await parseBulkInventoryMessage(body);
      const result = await executeBulkAdd(bulk.items, from);
      twiml.message(result.text);
      return sendTwiML(res, twiml);
    }

    const parsed = await parseRetailerMessage(body);
    const result = await executeAction(parsed, from);
    twiml.message(result.text);
  } catch (err) {
    const detail = err?.error?.message || err.message;
    console.error("Handler error:", detail);
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
    const code = err?.code || err?.status;
    const isTwilioRateLimit = code === 63038 || code === 429;
    twiml.message(isTwilioRateLimit ? voice.rateLimitError() : voice.handlerError());
  }

  sendTwiML(res, twiml);
});

module.exports = router;
