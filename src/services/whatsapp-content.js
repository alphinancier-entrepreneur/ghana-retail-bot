const { getTwilioClient } = require("./twilio");
const { loadServerEnv } = require("../config/env");
const voice = require("../copy/shop-voice");

function getContentSids() {
  return {
    welcome: process.env.TWILIO_CONTENT_SID_WELCOME?.trim() || "",
    moreMenu: process.env.TWILIO_CONTENT_SID_MORE_MENU?.trim() || "",
    bulkHelp: process.env.TWILIO_CONTENT_SID_BULK_HELP?.trim() || "",
  };
}

async function sendContentMessage(to, contentSid, contentVariables = null) {
  if (!contentSid || contentSid.includes("HXxxx")) {
    return false;
  }

  const { twilioWhatsappNumber } = loadServerEnv();
  const client = getTwilioClient();

  const payload = {
    from: twilioWhatsappNumber,
    to,
    contentSid,
  };

  if (contentVariables && Object.keys(contentVariables).length > 0) {
    payload.contentVariables = JSON.stringify(contentVariables);
  }

  await client.messages.create(payload);
  return true;
}

async function sendTextMessage(to, body) {
  const { twilioWhatsappNumber } = loadServerEnv();
  const client = getTwilioClient();
  await client.messages.create({
    from: twilioWhatsappNumber,
    to,
    body,
  });
  return true;
}

async function sendWelcomeMenu(to) {
  const sids = getContentSids();
  const sent = await sendContentMessage(to, sids.welcome);
  if (!sent) {
    await sendTextMessage(
      to,
      `${voice.welcomeMessage()}\n\n${voice.numberedFallbackMenu()}`
    );
  }
  return sent;
}

async function sendMoreMenu(to) {
  const sids = getContentSids();
  const sent = await sendContentMessage(to, sids.moreMenu);
  if (!sent) {
    await sendTextMessage(
      to,
      "More options:\n" +
        "Reply 3 — Bulk add delivery\n" +
        "Reply 4 — What we have in stock\n" +
        "Reply 5 — Today's sales\n\n" +
        "Or say: milo is 8 cedis / alert me when milo is below 5"
    );
  }
  return sent;
}

async function sendBulkHelp(to) {
  const sids = getContentSids();
  const sent = await sendContentMessage(to, sids.bulkHelp);
  if (!sent) {
    await sendTextMessage(to, voice.bulkInstructions());
  }
  return sent;
}

module.exports = {
  sendContentMessage,
  sendTextMessage,
  sendWelcomeMenu,
  sendMoreMenu,
  sendBulkHelp,
  getContentSids,
};
