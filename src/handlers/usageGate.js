const { normalizeWhatsAppPhone } = require("../services/retailer");
const { isUnlimitedUser } = require("../config/usage");
const { checkAndRecordUsage, isWaitlistKeyword } = require("../services/usage");
const { joinWaitlist } = require("../services/waitlist");
const usageMessages = require("../copy/usage-messages");

/**
 * WAITLIST replies — always allowed, even when daily limit is reached.
 */
async function handleWaitlist(whatsappFrom) {
  const phone = normalizeWhatsAppPhone(whatsappFrom);
  const result = await joinWaitlist(phone);
  return {
    text: result.alreadyJoined
      ? usageMessages.waitlistAlreadyJoined()
      : usageMessages.waitlistJoined(),
  };
}

/**
 * Usage gate: unlimited admins skip; WAITLIST is handled separately in webhook.
 */
async function applyUsageGate(whatsappFrom) {
  const phone = normalizeWhatsAppPhone(whatsappFrom);

  if (isUnlimitedUser(phone)) {
    return { proceed: true };
  }

  const gate = await checkAndRecordUsage(phone);

  if (gate.action === "warn_only") {
    return { proceed: false, text: usageMessages.usageWarning90() };
  }

  if (gate.action === "block") {
    if (gate.sendLimitMessage) {
      return { proceed: false, text: usageMessages.usageLimitReached() };
    }
    // Full limit copy already sent today — block without repeating
    return { proceed: false, text: null };
  }

  return { proceed: true };
}

module.exports = {
  handleWaitlist,
  applyUsageGate,
  isWaitlistKeyword,
};
