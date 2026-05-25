const { getSupabase } = require("./supabase");

async function getSession(retailerId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("retailer_sessions")
    .select("mode")
    .eq("retailer_id", retailerId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return { mode: "idle" };
    throw new Error(error.message);
  }

  return { mode: data?.mode || "idle" };
}

async function setSessionMode(retailerId, mode) {
  const supabase = getSupabase();
  const { error } = await supabase.from("retailer_sessions").upsert(
    {
      retailer_id: retailerId,
      mode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "retailer_id" }
  );

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "retailer_sessions table missing. Run supabase/migrations/20260521120000_retailer_sessions.sql"
      );
    }
    throw new Error(error.message);
  }
}

module.exports = { getSession, setSessionMode };
