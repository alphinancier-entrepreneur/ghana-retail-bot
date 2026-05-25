const express = require("express");
const {
  validateTwilioWebhook,
  createMessagingResponse,
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
const voice = require("../copy/shop-voice");

const router = express.Router();

router.post("/whatsapp", async (req, res) => {
  if (!validateTwilioWebhook(req)) {
    console.warn("Rejected webhook: invalid Twilio signature");
    return res.status(403).send("Forbidden");
  }

  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();

  console.log(`WhatsApp from ${from}: ${body}`);

  const twiml = createMessagingResponse();

  try {
    if (!body) {
      twiml.message(voice.helpMessage());
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    if (isGreeting(body)) {
      const result = await handleGreeting(from);
      twiml.message(result.text);
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    const menuPayload = resolveMenuPayload(body);
    if (menuPayload) {
      const menuResult = await handleMenuAction(menuPayload, from);
      if (menuResult) {
        twiml.message(menuResult.text);
        res.type("text/xml");
        return res.send(twiml.toString());
      }
    }

    const retailer = await getOrCreateRetailer(from);
    const session = await getSession(retailer.id);

    if (session.mode === "awaiting_bulk_inventory") {
      const bulk = await parseBulkInventoryMessage(body);
      const result = await executeBulkAdd(bulk.items, from);
      twiml.message(result.text);
      res.type("text/xml");
      return res.send(twiml.toString());
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

  res.type("text/xml");
  res.send(twiml.toString());
});

module.exports = router;
