/**
 * Free-tier usage limits and admin overrides.
 * Per-user cap cannot exceed Twilio account cap (trial sandbox ≈ 50 / 24h).
 */

const { TWILIO_DAILY_MESSAGE_CAP } = require("./twilioQuota");

const DAILY_FREE_LIMIT = Math.min(
  Number(process.env.DAILY_FREE_LIMIT) || 20,
  TWILIO_DAILY_MESSAGE_CAP
);

/** Ghana (GMT+0) — used for daily reset at local midnight */
const USAGE_TIMEZONE = "Africa/Accra";

/**
 * Phone numbers that skip usage limits (admin + testers).
 * Set in .env as comma-separated E.164 values, e.g. +233201234567,+233501234567
 */
function getUnlimitedUsers() {
  const raw = process.env.UNLIMITED_USERS || "";
  return raw
    .split(",")
    .map((p) => p.trim().replace(/^whatsapp:/i, ""))
    .filter(Boolean);
}

function isUnlimitedUser(phoneNumber) {
  const normalized = (phoneNumber || "").replace(/^whatsapp:/i, "").trim();
  return getUnlimitedUsers().some((p) => p === normalized);
}

/** 90% threshold — warning fires when count reaches this value (e.g. 18 of 20) */
function getWarningThreshold() {
  return Math.floor(DAILY_FREE_LIMIT * 0.9);
}

module.exports = {
  DAILY_FREE_LIMIT,
  USAGE_TIMEZONE,
  getUnlimitedUsers,
  isUnlimitedUser,
  getWarningThreshold,
};
