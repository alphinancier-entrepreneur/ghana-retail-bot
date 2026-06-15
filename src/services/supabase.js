const { createClient } = require("@supabase/supabase-js");
const { loadSupabaseEnv } = require("../config/env");

let client = null;

const REQUIRED_TABLES = [
  "retailers",
  "user_usage",
  "expenditures",
  "twilio_send_log",
  "webhook_events",
];

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
  const missing = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      if (error.code === "42P01") {
        missing.push(table);
      } else {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
    }
  }

  if (missing.length) {
    throw new Error(
      `Connected to Supabase, but tables are missing: ${missing.join(", ")}. ` +
        "Run all SQL files in supabase/migrations/ in filename order."
    );
  }

  return true;
}

module.exports = { getSupabase, checkSupabaseConnection };
