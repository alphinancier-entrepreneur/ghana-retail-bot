const { normalizeWhatsAppPhone } = require("../services/retailer");
const { isUnlimitedUser, isUsageLimitsDisabled } = require("../config/usage");
const {
  checkAndRecordUsage,
  isWaitlistKeyword,
  markLimitNotice,
} = require("../services/usage");
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
  if (isUsageLimitsDisabled()) {
    return { proceed: true };
  }

  const phone = normalizeWhatsAppPhone(whatsappFrom);

  if (isUnlimitedUser(phone)) {
    return { proceed: true };
  }

  const gate = await checkAndRecordUsage(phone);

  if (gate.action === "warn_only") {
    return { proceed: false, text: usageMessages.usageWarning90() };
  }

  if (gate.action === "block") {
    const text = gate.sendLimitMessage
      ? usageMessages.usageLimitReached()
      : usageMessages.usageLimitReminder();
    return {
      proceed: false,
      text,
      markLimitAfterSend: gate.sendLimitMessage,
      phone,
    };
  }

  return { proceed: true };
}

/**
 * Call after limit message was delivered successfully (once per day).
 */
async function confirmLimitNoticeSent(usageGateResult) {
  if (usageGateResult?.markLimitAfterSend && usageGateResult?.phone) {
    await markLimitNotice(usageGateResult.phone);
  }
}

module.exports = {
  handleWaitlist,
  applyUsageGate,
  confirmLimitNoticeSent,
  isWaitlistKeyword,
};
