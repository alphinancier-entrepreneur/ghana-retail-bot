const { getSupabase } = require("./supabase");
const {
  TWILIO_DAILY_MESSAGE_CAP,
  TWILIO_QUOTA_WINDOW_MS,
  getTwilioWarningThreshold,
} = require("../config/twilioQuota");

const SINGLETON_KEY = "default";

function windowStartIso() {
  return new Date(Date.now() - TWILIO_QUOTA_WINDOW_MS).toISOString();
}

/** How many outbound messages we logged in the last 24 hours. */
async function getOutboundCount24h() {
  const supabase = getSupabase();
  const since = windowStartIso();

  const { count, error } = await supabase
    .from("twilio_send_log")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", since);

  if (error) throw new Error(error.message);
  return count || 0;
}

async function recordOutboundSend() {
  const supabase = getSupabase();
  const { error } = await supabase.from("twilio_send_log").insert({});
  if (error) throw new Error(error.message);
}

async function getQuotaState() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("twilio_quota_state")
    .select("hard_cap_detected_at, warned_90_at")
    .eq("singleton_key", SINGLETON_KEY)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || { hard_cap_detected_at: null, warned_90_at: null };
}

async function markHardCapDetected() {
  const supabase = getSupabase();
  await supabase
    .from("twilio_quota_state")
    .update({ hard_cap_detected_at: new Date().toISOString() })
    .eq("singleton_key", SINGLETON_KEY);
}

async function markWarned90() {
  const supabase = getSupabase();
  await supabase
    .from("twilio_quota_state")
    .update({ warned_90_at: new Date().toISOString() })
    .eq("singleton_key", SINGLETON_KEY);
}

/**
 * True when our counter says the account is at cap OR we recently saw Twilio 63038.
 */
async function isTwilioAccountCapReached() {
  const count = await getOutboundCount24h();
  if (count >= TWILIO_DAILY_MESSAGE_CAP) return true;

  const state = await getQuotaState();
  if (!state.hard_cap_detected_at) return false;

  const detectedAt = new Date(state.hard_cap_detected_at).getTime();
  return Date.now() - detectedAt < TWILIO_QUOTA_WINDOW_MS;
}

/** True once per rolling window when crossing 90% of Twilio cap. */
async function shouldSendTwilio90Warning() {
  const count = await getOutboundCount24h();
  const warnAt = getTwilioWarningThreshold();
  if (count < warnAt) return false;

  const state = await getQuotaState();
  if (!state.warned_90_at) return true;

  const warnedAt = new Date(state.warned_90_at).getTime();
  return Date.now() - warnedAt >= TWILIO_QUOTA_WINDOW_MS;
}

module.exports = {
  getOutboundCount24h,
  recordOutboundSend,
  isTwilioAccountCapReached,
  shouldSendTwilio90Warning,
  markHardCapDetected,
  markWarned90,
  TWILIO_DAILY_MESSAGE_CAP,
};
