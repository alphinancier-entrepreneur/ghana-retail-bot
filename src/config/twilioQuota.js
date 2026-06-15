/**
 * Twilio account outbound limit (trial sandbox ≈ 50 / rolling 24 hours).
 * Set TWILIO_DAILY_MESSAGE_CAP in .env to match your Twilio plan.
 */

const TWILIO_DAILY_MESSAGE_CAP = Number(process.env.TWILIO_DAILY_MESSAGE_CAP) || 50;

/** Rolling window — matches Twilio trial limit behaviour */
const TWILIO_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

function getTwilioWarningThreshold() {
  return Math.floor(TWILIO_DAILY_MESSAGE_CAP * 0.9);
}

module.exports = {
  TWILIO_DAILY_MESSAGE_CAP,
  TWILIO_QUOTA_WINDOW_MS,
  getTwilioWarningThreshold,
};
