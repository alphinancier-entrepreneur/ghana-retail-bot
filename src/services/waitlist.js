const { getSupabase } = require("./supabase");

/**
 * WAITLIST keyword — save phone + timestamp; idempotent per user.
 */
async function joinWaitlist(phoneNumber) {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("waitlist")
    .select("phone_number")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (existing) {
    return { alreadyJoined: true };
  }

  const { error } = await supabase.from("waitlist").insert({
    phone_number: phoneNumber,
    joined_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { alreadyJoined: false };
}

module.exports = { joinWaitlist };
