const twilio = require("twilio");
const { loadServerEnv } = require("../config/env");

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const { twilioAccountSid, twilioAuthToken } = loadServerEnv();
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  return twilioClient;
}

function buildWebhookUrl(req) {
  const { publicWebhookBaseUrl } = loadServerEnv();
  const path = req.originalUrl || req.url;

  if (
    publicWebhookBaseUrl &&
    !publicWebhookBaseUrl.includes("your-public-url")
  ) {
    return `${publicWebhookBaseUrl.replace(/\/$/, "")}${path}`;
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
