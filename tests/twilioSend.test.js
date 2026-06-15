const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const twilioSendSrc = fs.readFileSync(
  path.join(__dirname, "..", "src", "services", "twilioSend.js"),
  "utf8"
);
const twilioSrc = fs.readFileSync(
  path.join(__dirname, "..", "src", "services", "twilio.js"),
  "utf8"
);

test("twilioSend replies via TwiML only (no REST messages.create)", () => {
  assert.doesNotMatch(twilioSendSrc, /messages\.create/);
  assert.doesNotMatch(twilioSendSrc, /getTwilioClient/);
  assert.match(twilioSendSrc, /sendTwimlReply/);
  assert.match(twilioSendSrc, /reply via twiml/);
});

test("twilio service has no outbound REST client", () => {
  assert.doesNotMatch(twilioSrc, /messages\.create/);
  assert.doesNotMatch(twilioSrc, /getTwilioClient/);
});
