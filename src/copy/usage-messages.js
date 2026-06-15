/**
 * Exact copy for usage limits and waitlist — do not paraphrase in handlers.
 */

function usageWarning90() {
  return (
    "⚡ Heads up — you're almost out of messages for today.\n\n" +
    "You've been using RetailBot like a proper business owner, and honestly? " +
    "Your shop deserves unlimited access.\n\n" +
    "🚀 Join the early access waitlist and be first in line when we launch " +
    "our paid plan — priority pricing, locked in forever.\n\n" +
    "👉 Reply *WAITLIST* to save your spot. Takes 5 seconds.\n\n" +
    "(You have a few messages left today — use them wisely 😏)"
  );
}

function usageLimitReached() {
  return (
    "🔒 You've hit your free limit for today — which means you've been " +
    "running your shop like a boss.\n\n" +
    "Free resets tomorrow at midnight. But why wait?\n\n" +
    "Reply *WAITLIST* to get early access to unlimited RetailBot — " +
    "built for serious traders. 🇬🇭"
  );
}

/** Shorter repeat if they message again after the full limit notice was already sent */
function usageLimitReminder() {
  return (
    "🔒 You're still at today's free message limit — resets at midnight (Ghana time).\n\n" +
    "Reply *WAITLIST* for early access to unlimited RetailBot."
  );
}

function waitlistAlreadyJoined() {
  return "You're already on the list 🙌 We'll hit you up when it's time.";
}

function waitlistJoined() {
  return (
    "You're on the list ✅ We'll reach out personally when early access " +
    "opens. Keep running your shop — RetailBot's got you."
  );
}

module.exports = {
  usageWarning90,
  usageLimitReached,
  usageLimitReminder,
  waitlistAlreadyJoined,
  waitlistJoined,
};
