/**
 * Compare Twilio's outbound message count vs our Supabase tracker (last 24h).
 * Run: npm run verify:twilio-quota
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const twilio = require("twilio");
const { getSupabase } = require("../src/services/supabase");
const { TWILIO_DAILY_MESSAGE_CAP } = require("../src/config/twilioQuota");

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();

function mask(value, show = 4) {
  if (!value) return "(missing)";
  return `${value.slice(0, show)}...${value.slice(-show)}`;
}

async function countTwilioOutbound24h(client, accountSid) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;
  let outboundApi = 0;
  let outboundReply = 0;

  const page = await client.messages.list({
    dateSentAfter: since,
    limit: 100,
  });

  for (const msg of page) {
    if (msg.direction === "outbound-api") outboundApi += 1;
    if (msg.direction === "outbound-reply") outboundReply += 1;
    if (msg.direction?.startsWith("outbound")) total += 1;
  }

  return { total, outboundApi, outboundReply, fetched: page.length };
}

async function countSupabaseOutbound24h(accountSid) {
  const supabase = getSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("twilio_send_log")
    .select("id", { count: "exact", head: true })
    .eq("account_sid", accountSid)
    .gte("sent_at", since);

  if (error) throw new Error(error.message);
  return count || 0;
}

async function main() {
  console.log("--- Twilio quota check (rolling 24h) ---");
  console.log("Account SID:", sid ? mask(sid) : "MISSING");
  console.log("Configured cap (TWILIO_DAILY_MESSAGE_CAP):", TWILIO_DAILY_MESSAGE_CAP);

  if (!sid || !token) {
    console.error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env");
    process.exit(1);
  }

  const client = twilio(sid, token);
  const account = await client.api.accounts(sid).fetch();
  console.log("Account name:", account.friendlyName);
  console.log("Account status:", account.status);

  const twilioCounts = await countTwilioOutbound24h(client, sid);
  const supabaseCount = await countSupabaseOutbound24h(sid);

  console.log("\n--- Twilio API (last 100 messages in 24h window) ---");
  console.log("Outbound total:", twilioCounts.total);
  console.log("  outbound-api (REST):", twilioCounts.outboundApi);
  console.log("  outbound-reply (TwiML):", twilioCounts.outboundReply);
  console.log("(Bot should only produce outbound-reply, not outbound-api.)");

  console.log("\n--- Supabase twilio_send_log (this account) ---");
  console.log("Logged outbound:", supabaseCount);

  if (twilioCounts.outboundApi > 0) {
    console.log(
      "\nNote: outbound-api rows mean REST sends — check Twilio Request Inspector on one message."
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
