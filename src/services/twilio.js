const twilio = require("twilio");
const { loadServerEnv } = require("../config/env");

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const { twilioAccountSid, twilioAuthToken } = loadServerEnv();
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  return twilioClient;
}

function normalizePublicBaseUrl(url) {
  if (!url) return "";
  let base = url.trim().replace(/\/$/, "");
  // Common mistake: pasting the full webhook path into PUBLIC_WEBHOOK_BASE_URL
  base = base.replace(/\/webhook\/whatsapp$/i, "");
  return base;
}

function buildWebhookUrl(req) {
  const { publicWebhookBaseUrl } = loadServerEnv();
  const path = req.originalUrl || req.url;

  const base = normalizePublicBaseUrl(publicWebhookBaseUrl);
  if (base && !base.includes("your-public-url")) {
    return `${base}${path}`;
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}${path}`;
}

function validateTwilioWebhook(req) {
  const { twilioAuthToken } = loadServerEnv();
  const signature = req.headers["x-twilio-signature"] || "";
  const url = buildWebhookUrl(req);

  return twilio.validateRequest(twilioAuthToken, signature, url, req.body);
}

function createMessagingResponse() {
  return new twilio.twiml.MessagingResponse();
}

module.exports = {
  getTwilioClient,
  validateTwilioWebhook,
  createMessagingResponse,
  buildWebhookUrl,
};
