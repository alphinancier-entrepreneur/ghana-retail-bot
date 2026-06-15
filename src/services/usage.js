const { getSupabase } = require("./supabase");
const {
  DAILY_FREE_LIMIT,
  getWarningThreshold,
} = require("../config/usage");
const { getGhanaTodayDateString } = require("../utils/ghanaDate");

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
  const today = getGhanaTodayDateString();
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
  const today = getGhanaTodayDateString();
  const supabase = getSupabase();
  await supabase
    .from("user_usage")
    .update({ warned_90_on: today })
    .eq("phone_number", phoneNumber);
}

async function markLimitNotice(phoneNumber) {
  const today = getGhanaTodayDateString();
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
  const today = getGhanaTodayDateString();
  const row = await getOrResetUsage(phoneNumber);
  const warnAt = getWarningThreshold();

  if (row.message_count >= DAILY_FREE_LIMIT) {
    return {
      action: "block",
      sendLimitMessage: row.limit_notice_on !== today,
    };
  }

  const updated = await incrementMessageCount(phoneNumber);

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
  getOrResetUsage,
  checkAndRecordUsage,
  isWaitlistKeyword,
};
