/**
 * One-off check: Twilio credentials and WhatsApp sandbox number.
 * Run: node scripts/verify-twilio.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const twilio = require("twilio");

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();
const whatsapp = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
const publicUrl = process.env.PUBLIC_WEBHOOK_BASE_URL?.trim();

function mask(value, show = 4) {
  if (!value) return "(missing)";
  if (value.length <= show * 2) return "***";
  return `${value.slice(0, show)}...${value.slice(-show)}`;
}

async function main() {
  console.log("--- .env format check ---");
  console.log("TWILIO_ACCOUNT_SID:", sid ? (sid.startsWith("AC") ? `OK (${mask(sid)})` : "WRONG — must start with AC") : "MISSING");
  console.log("TWILIO_AUTH_TOKEN:", token ? `set (${mask(token)})` : "MISSING");
  console.log(
    "TWILIO_WHATSAPP_NUMBER:",
    whatsapp
      ? whatsapp.startsWith("whatsapp:+")
        ? `OK (${whatsapp})`
        : "WRONG — use format whatsapp:+14155238886"
      : "MISSING"
  );
  console.log(
    "PUBLIC_WEBHOOK_BASE_URL:",
    publicUrl && !publicUrl.includes("your-public-url")
      ? `OK (${publicUrl})`
      : "NOT SET — copy your ngrok https URL here (no trailing slash)"
  );

  if (!sid || !token) {
    process.exit(1);
  }

  console.log("\n--- Twilio API check ---");
  try {
    const client = twilio(sid, token);
    const account = await client.api.accounts(sid).fetch();
    console.log("API auth: OK");
    console.log("Account name:", account.friendlyName);
    console.log("Account status:", account.status);
  } catch (err) {
    console.log("API auth: FAILED");
    console.log(err.message);
    process.exit(1);
  }

  if (publicUrl && !publicUrl.includes("your-public-url")) {
    console.log("\n--- Webhook URL to paste in Twilio ---");
    console.log(`${publicUrl.replace(/\/$/, "")}/webhook/whatsapp`);
  }
}

main();
