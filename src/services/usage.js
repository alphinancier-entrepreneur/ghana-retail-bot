const { getSupabase } = require("./supabase");
const {
  DAILY_FREE_LIMIT,
  USAGE_TIMEZONE,
  getWarningThreshold,
} = require("../config/usage");

/**
 * Current calendar date in Ghana (GMT+0) as YYYY-MM-DD for daily resets.
 */
function getGhanaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: USAGE_TIMEZONE }).format(
    new Date()
  );
}

async function getUsageRow(phoneNumber) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_usage")
    .select("phone_number, message_count, last_reset_date, warned_90_on, limit_notice_on")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * If last_reset_date is before today (Ghana), zero the count and clear one-time flags.
 */
async function getOrResetUsage(phoneNumber) {
  const today = getGhanaToday();
  const supabase = getSupabase();
  let row = await getUsageRow(phoneNumber);

  if (!row) {
    const { data, error } = await supabase
      .from("user_usage")
      .insert({
        phone_number: phoneNumber,
        message_count: 0,
        last_reset_date: today,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  if (row.last_reset_date < today) {
    const { data, error } = await supabase
      .from("user_usage")
      .update({
        message_count: 0,
        last_reset_date: today,
        warned_90_on: null,
        limit_notice_on: null,
      })
      .eq("phone_number", phoneNumber)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  return row;
}

async function incrementMessageCount(phoneNumber) {
  const row = await getOrResetUsage(phoneNumber);
  const supabase = getSupabase();
  const next = row.message_count + 1;

  const { data, error } = await supabase
    .from("user_usage")
    .update({ message_count: next })
    .eq("phone_number", phoneNumber)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function markWarned90(phoneNumber) {
  const today = getGhanaToday();
  const supabase = getSupabase();
  await supabase
    .from("user_usage")
    .update({ warned_90_on: today })
    .eq("phone_number", phoneNumber);
}

async function markLimitNotice(phoneNumber) {
  const today = getGhanaToday();
  const supabase = getSupabase();
  await supabase
    .from("user_usage")
    .update({ limit_notice_on: today })
    .eq("phone_number", phoneNumber);
}

function isWaitlistKeyword(body) {
  return /^\s*waitlist\s*$/i.test((body || "").trim());
}

/**
 * Enforce daily free limit before running the bot.
 * Returns { action: 'allow' | 'block' | 'warn_only', text? }
 */
async function checkAndRecordUsage(phoneNumber) {
  const today = getGhanaToday();
  const row = await getOrResetUsage(phoneNumber);
  const warnAt = getWarningThreshold();

  // Already at or over limit — block (limit copy sent once per day)
  if (row.message_count >= DAILY_FREE_LIMIT) {
    const sendFullNotice = row.limit_notice_on !== today;
    if (sendFullNotice) {
      await markLimitNotice(phoneNumber);
    }
    return {
      action: "block",
      sendLimitMessage: sendFullNotice,
    };
  }

  const updated = await incrementMessageCount(phoneNumber);

  // Just hit 90% (e.g. 18/20) — warning once per day, no bot processing this turn
  if (
    updated.message_count === warnAt &&
    updated.warned_90_on !== today
  ) {
    await markWarned90(phoneNumber);
    return { action: "warn_only" };
  }

  return { action: "allow" };
}

module.exports = {
  getGhanaToday,
  getOrResetUsage,
  checkAndRecordUsage,
  isWaitlistKeyword,
};
