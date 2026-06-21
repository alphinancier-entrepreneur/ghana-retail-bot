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
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
const publicUrl = process.env.PUBLIC_WEBHOOK_BASE_URL?.trim();

function mask(value, show = 4) {
  if (!value) return "(missing)";
  return `${value.slice(0, show)}...${value.slice(-show)}`;
}

function detectEnvironment() {
  if (!publicUrl) return "unknown (set PUBLIC_WEBHOOK_BASE_URL)";
  if (/onrender\.com/i.test(publicUrl)) return "Pro (Render)";
  if (/ngrok/i.test(publicUrl) || /localhost/i.test(publicUrl)) return "Dev (local + ngrok)";
  return `custom (${publicUrl})`;
}

async function countTwilioOutbound24h(client) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;
  let outboundApi = 0;
  let outboundReply = 0;
  let failed = 0;
  let delivered = 0;
  const failedMessages = [];

  const page = await client.messages.list({
    dateSentAfter: since,
    limit: 100,
  });

  for (const msg of page) {
    if (msg.direction === "outbound-api") outboundApi += 1;
    if (msg.direction === "outbound-reply") outboundReply += 1;
    if (msg.direction?.startsWith("outbound")) {
      total += 1;
      if (msg.status === "failed" || msg.status === "undelivered") {
        failed += 1;
        failedMessages.push({
          sid: msg.sid,
          status: msg.status,
          direction: msg.direction,
          errorCode: msg.errorCode ?? null,
          errorMessage: msg.errorMessage ?? null,
          dateSent: msg.dateSent,
        });
      }
      if (
        msg.status === "delivered" ||
        msg.status === "read" ||
        msg.status === "sent"
      ) {
        delivered += 1;
      }
    }
  }

  failedMessages.sort(
    (a, b) => new Date(b.dateSent || 0).getTime() - new Date(a.dateSent || 0).getTime()
  );

  return { total, outboundApi, outboundReply, failed, delivered, fetched: page.length, failedMessages };
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

function printFailedDetails(failedMessages) {
  if (!failedMessages.length) return;

  console.log("\n--- Failed outbound details (newest first) ---");
  const show = failedMessages.slice(0, 10);
  for (const msg of show) {
    const when = msg.dateSent ? new Date(msg.dateSent).toISOString() : "unknown time";
    const code = msg.errorCode != null ? msg.errorCode : "(none)";
    const detail = msg.errorMessage || "(no message)";
    console.log(
      `  ${when} | ${msg.direction} | ${msg.status} | error ${code}: ${detail}`
    );
  }
  if (failedMessages.length > show.length) {
    console.log(`  ... and ${failedMessages.length - show.length} more failed row(s)`);
  }

  const errorCounts = {};
  for (const msg of failedMessages) {
    const key = msg.errorCode != null ? String(msg.errorCode) : "unknown";
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  }
  console.log("\nFailed error codes in window:", errorCounts);
}

function printDeliveryWarnings(twilioCounts, headroom) {
  const has63038 = twilioCounts.failedMessages.some((m) => m.errorCode === 63038);

  if (twilioCounts.failed > 0 && twilioCounts.delivered > 0 && twilioCounts.failed >= twilioCounts.delivered) {
    console.log(
      "\n*** WARNING: Failed outbounds match or exceed delivered in this window."
    );
    console.log(
      "Twilio is rejecting delivery — internal cap headroom is irrelevant until Twilio accepts sends again."
    );
  }

  if (headroom > 0 && has63038) {
    console.log(
      "\n*** WARNING: Twilio returned error 63038 while our counter still shows headroom."
    );
    console.log(
      "Twilio enforces its own rolling 24h limit (trial ~50/day, sometimes lower). Our TWILIO_DAILY_MESSAGE_CAP is only a soft gate in the app."
    );
  }

  if (has63038) {
    console.log("\n--- 63038 — what to do ---");
    console.log("1. Wait for Twilio's rolling 24h window to reset (check Monitor → Logs → Errors for first 63038 time).");
    console.log("2. Or test on RetailBot-Pro if that subaccount is upgraded and has separate quota.");
    console.log("3. Or upgrade RetailBot-Dev from trial for higher daily volume.");
    console.log(
      "4. Message the WhatsApp number listed above on THIS subaccount — Dev and Pro use different Twilio accounts."
    );
  }

  console.log(
    "\nNote: terminal 'reply via twiml' or Render logs only mean the server returned TwiML — not that WhatsApp delivery succeeded."
  );
}

async function main() {
  console.log("--- Twilio quota check (rolling 24h) ---");
  console.log("Account SID:", sid ? mask(sid) : "MISSING");
  console.log("Configured cap (TWILIO_DAILY_MESSAGE_CAP):", TWILIO_DAILY_MESSAGE_CAP);
  console.log("Environment:", detectEnvironment());
  console.log("WhatsApp sender (message THIS number in sandbox):", whatsappNumber || "MISSING");
  console.log("Webhook base:", publicUrl || "MISSING");

  if (!sid || !token) {
    console.error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env");
    process.exit(1);
  }

  const client = twilio(sid, token);
  const account = await client.api.accounts(sid).fetch();
  console.log("Account name:", account.friendlyName);
  console.log("Account status:", account.status);
  console.log(
    "\nMatch check: text the WhatsApp number above while this webhook base is active in Twilio Console."
  );
  console.log(
    "If Twilio Console errors are on a different subaccount (e.g. Pro vs Dev), quota here will not match."
  );

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
  console.log("\n--- Cap headroom (app soft gate only) ---");
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

  printFailedDetails(twilioCounts.failedMessages);
  printDeliveryWarnings(twilioCounts, headroom);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
