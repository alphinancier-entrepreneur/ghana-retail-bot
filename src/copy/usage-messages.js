/**
 * Exact copy for usage limits and waitlist — do not paraphrase in handlers.
 */

function usageWarning90() {
  return (
    "⚡ You're almost out of messages for today — you've been running your shop properly.\n\n" +
    "Reply WAITLIST to get early access to unlimited Mariam — priority pricing, " +
    "locked forever. Takes 5 seconds. 😏"
  );
}

function usageLimitReached() {
  return (
    "🔒 Free limit for today done — your shop had a busy day. Resets at midnight.\n\n" +
    "Reply WAITLIST for unlimited access. 🇬🇭"
  );
}

/** Shorter repeat if they message again after the full limit notice was already sent */
function usageLimitReminder() {
  return (
    "🔒 Still at today's free limit — resets at midnight (Ghana time).\n\n" +
    "Reply WAITLIST for unlimited Mariam."
  );
}

function waitlistAlreadyJoined() {
  return "You're already on the list 🙌 We'll hit you up when it's time.";
}

function waitlistJoined() {
  return (
    "You're on the list ✅ We'll reach out personally when early access opens. " +
    "Keep running your shop — Mariam's got you."
  );
}

module.exports = {
  usageWarning90,
  usageLimitReached,
  usageLimitReminder,
  waitlistAlreadyJoined,
  waitlistJoined,
};
