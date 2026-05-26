const { createClient } = require("@supabase/supabase-js");
const { loadSupabaseEnv } = require("../config/env");

let client = null;

function getSupabase() {
  if (client) return client;

  const { supabaseUrl, supabaseServiceRoleKey } = loadSupabaseEnv();

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

async function checkSupabaseConnection() {
  const supabase = getSupabase();
  const { error } = await supabase.from("retailers").select("id").limit(1);

  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "Connected to Supabase, but tables are missing. Run all SQL files in supabase/migrations/ (including user_usage + waitlist)."
      );
    }
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  return true;
}

module.exports = { getSupabase, checkSupabaseConnection };
