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

async function countTwilioOutbound24h(client) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;
  let outboundApi = 0;
  let outboundReply = 0;
  let failed = 0;
  let delivered = 0;

  const page = await client.messages.list({
    dateSentAfter: since,
    limit: 100,
  });

  for (const msg of page) {
    if (msg.direction === "outbound-api") outboundApi += 1;
    if (msg.direction === "outbound-reply") outboundReply += 1;
    if (msg.direction?.startsWith("outbound")) {
      total += 1;
      if (msg.status === "failed" || msg.status === "undelivered") failed += 1;
      if (
        msg.status === "delivered" ||
        msg.status === "read" ||
        msg.status === "sent"
      ) {
        delivered += 1;
      }
    }
  }

  return { total, outboundApi, outboundReply, failed, delivered, fetched: page.length };
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

  const twilioCounts = await countTwilioOutbound24h(client);
  const supabaseCount = await countSupabaseOutbound24h(sid);

  console.log("\n--- Twilio API (last 100 messages in 24h window) ---");
  console.log("Outbound total:", twilioCounts.total);
  console.log("  Delivered/sent/read:", twilioCounts.delivered);
  console.log("  Failed/undelivered:", twilioCounts.failed);
  console.log("  Direction outbound-api:", twilioCounts.outboundApi);
  console.log("  Direction outbound-reply:", twilioCounts.outboundReply);
  console.log(
    "\nWhatsApp sandbox: successful replies often show as outbound-api in the API."
  );
  console.log("Console 'Outgoing API + Delivered' is normal. Failed rows matter.");

  console.log("\n--- Supabase twilio_send_log (this account) ---");
  console.log("Logged outbound:", supabaseCount);

  const headroom = TWILIO_DAILY_MESSAGE_CAP - twilioCounts.total;
  console.log("\n--- Cap headroom ---");
  console.log(
    headroom > 0
      ? `About ${headroom} outbound messages left vs configured cap (${TWILIO_DAILY_MESSAGE_CAP}).`
      : `At or over configured cap (${TWILIO_DAILY_MESSAGE_CAP}).`
  );

  if (supabaseCount > 0 && twilioCounts.total > supabaseCount * 2) {
    console.log(
      "\nWarning: Twilio outbound count is much higher than Supabase log — possible double-send. Check for two Delivered rows per inbound in Console."
    );
  }

  if (twilioCounts.failed > 0) {
    console.log(
      `\nNote: ${twilioCounts.failed} failed outbound(s) in window — click Troubleshoot on Failed rows in Twilio (often 63038).`
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
