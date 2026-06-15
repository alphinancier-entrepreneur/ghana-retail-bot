const { createMessagingResponse } = require("./twilio");
const voice = require("../copy/shop-voice");
const {
  recordOutboundSend,
  markHardCapDetected,
  markWarned90,
  isTwilioAccountCapReached,
  shouldSendTwilio90Warning,
} = require("./twilioQuota");

function isTwilioRateLimitError(err) {
  const code = err?.code || err?.status;
  return code === 63038 || code === 429;
}

function twilioQuotaWarning() {
  return (
    "heads up — this WhatsApp line is almost at its daily message limit for today.\n\n" +
    "replies may stop soon until the limit resets (usually within 24 hours)."
  );
}

/**
 * One WhatsApp reply per request via TwiML (avoids REST + TwiML double send).
 */
function sendTwimlReply(res, body) {
  const twiml = createMessagingResponse();
  if (body && body.trim()) {
    twiml.message(body);
  }
  res.type("text/xml");
  res.send(twiml.toString());
}

/**
 * Send reply in webhook response only — counts once toward our Twilio quota tracker.
 */
async function deliverReply(res, { body }) {
  const text = (body || "").trim();
  sendTwimlReply(res, text);
  if (text) {
    await recordOutboundSend();
  }
  return { ok: true, via: "twiml" };
}

/**
 * Check account quota before processing. No extra REST message for 90% warning.
 */
async function checkTwilioCapGate() {
  const atCap = await isTwilioAccountCapReached();
  if (atCap) {
    await markHardCapDetected();
    return { blocked: true, prependText: null };
  }

  if (await shouldSendTwilio90Warning()) {
    await markWarned90();
    return { blocked: false, prependText: `${twilioQuotaWarning()}\n\n` };
  }

  return { blocked: false, prependText: null };
}

/**
 * Build a one-reply helper that prepends the 90% Twilio warning once (same message).
 */
function createReplySender(res, gate) {
  let prepend = gate.prependText || null;

  return async (text) => {
    let body = text;
    if (prepend) {
      body = prepend + text;
      prepend = null;
    }
    return deliverReply(res, { body });
  };
}

module.exports = {
  deliverReply,
  checkTwilioCapGate,
  createReplySender,
  isTwilioRateLimitError,
};
