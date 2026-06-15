/**
 * Business-day boundaries for Ghana (GMT+0, Africa/Accra).
 * Accra has no DST, so UTC midnight matches local midnight.
 */

const GHANA_TIMEZONE = "Africa/Accra";

function getGhanaTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GHANA_TIMEZONE }).format(
    new Date()
  );
}

/** ISO timestamp for start of today in Ghana (00:00:00 UTC). */
function getGhanaTodayStartIso() {
  const today = getGhanaTodayDateString();
  return `${today}T00:00:00.000Z`;
}

module.exports = {
  GHANA_TIMEZONE,
  getGhanaTodayDateString,
  getGhanaTodayStartIso,
};
