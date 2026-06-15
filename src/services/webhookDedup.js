const { getSupabase } = require("./supabase");

/** Postgres unique violation — same MessageSid already claimed. */
function isDuplicateMessageSidError(error) {
  return error?.code === "23505";
}

/**
 * Claim a Twilio MessageSid before processing. Returns duplicate: true if already seen.
 */
async function claimMessage(messageSid, phoneNumber) {
  if (!messageSid || !String(messageSid).trim()) {
    return { duplicate: false, claimed: true };
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("webhook_events").insert({
    message_sid: String(messageSid).trim(),
    phone_number: phoneNumber || "",
  });

  if (error) {
    if (isDuplicateMessageSidError(error)) {
      return { duplicate: true, claimed: false };
    }
    throw new Error(error.message);
  }

  return { duplicate: false, claimed: true };
}

module.exports = {
  claimMessage,
  isDuplicateMessageSidError,
};
