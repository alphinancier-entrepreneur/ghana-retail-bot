const { getSupabase } = require("./supabase");
const {
  TWILIO_DAILY_MESSAGE_CAP,
  TWILIO_QUOTA_WINDOW_MS,
  getTwilioWarningThreshold,
} = require("../config/twilioQuota");

function getAccountSid() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!sid) {
    throw new Error(
      "TWILIO_ACCOUNT_SID is required for quota tracking. Set it in .env or Render environment."
    );
  }
  return sid;
}

function windowStartIso() {
  return new Date(Date.now() - TWILIO_QUOTA_WINDOW_MS).toISOString();
}

/** How many outbound messages we logged in the last 24 hours for this Twilio account. */
async function getOutboundCount24h() {
  const supabase = getSupabase();
  const since = windowStartIso();
  const accountSid = getAccountSid();

  const { count, error } = await supabase
    .from("twilio_send_log")
    .select("id", { count: "exact", head: true })
    .eq("account_sid", accountSid)
    .gte("sent_at", since);

  if (error) throw new Error(error.message);
  return count || 0;
}

async function recordOutboundSend() {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("twilio_send_log")
    .insert({ account_sid: getAccountSid() });
  if (error) throw new Error(error.message);
}

async function getQuotaState() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("twilio_quota_state")
    .select("hard_cap_detected_at, warned_90_at")
    .eq("account_sid", getAccountSid())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || { hard_cap_detected_at: null, warned_90_at: null };
}

async function markHardCapDetected() {
  const supabase = getSupabase();
  const accountSid = getAccountSid();
  const { error } = await supabase.from("twilio_quota_state").upsert(
    {
      account_sid: accountSid,
      hard_cap_detected_at: new Date().toISOString(),
    },
    { onConflict: "account_sid" }
  );
  if (error) throw new Error(error.message);
}

async function markWarned90() {
  const supabase = getSupabase();
  const accountSid = getAccountSid();
  const { error } = await supabase.from("twilio_quota_state").upsert(
    {
      account_sid: accountSid,
      warned_90_at: new Date().toISOString(),
    },
    { onConflict: "account_sid" }
  );
  if (error) throw new Error(error.message);
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
  getAccountSid,
  getOutboundCount24h,
  recordOutboundSend,
  isTwilioAccountCapReached,
  shouldSendTwilio90Warning,
  markHardCapDetected,
  markWarned90,
  TWILIO_DAILY_MESSAGE_CAP,
};
