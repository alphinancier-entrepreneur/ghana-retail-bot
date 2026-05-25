/**
 * One-time: create Twilio Content templates for WhatsApp buttons.
 * Run: node scripts/setup-whatsapp-templates.js
 * Then copy the printed HX... values into .env
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const twilio = require("twilio");
const voice = require("../src/copy/shop-voice");

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();

if (!sid || !token) {
  console.error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = twilio(sid, token);

async function createTemplate(friendlyName, types) {
  const existing = await client.content.v1.contents.list({ limit: 100 });
  const found = existing.find((t) => t.friendlyName === friendlyName);
  if (found) {
    console.log(`Exists: ${friendlyName} → ${found.sid}`);
    return found.sid;
  }

  const created = await client.content.v1.contents.create({
    friendlyName,
    language: "en",
    types,
  });
  console.log(`Created: ${friendlyName} → ${created.sid}`);
  return created.sid;
}

async function main() {
  const welcomeBody = voice.welcomeMessage();

  const welcomeSid = await createTemplate("shop-welcome-quick-reply", {
    "twilio/text": { body: welcomeBody },
    "twilio/quick-reply": {
      body: welcomeBody,
      actions: [
        { title: "Add stock", id: "menu_add" },
        { title: "Record sale", id: "menu_sale" },
        { title: "More options", id: "menu_more" },
      ],
    },
  });

  const moreSid = await createTemplate("shop-more-list", {
    "twilio/text": {
      body: "Choose what you'd like to do next:",
    },
    "twilio/list-picker": {
      body: "Choose what you'd like to do next:",
      button: "See options",
      items: [
        {
          id: "shop_menu",
          item: "Shop menu",
          description: "Tap an option",
          options: [
            {
              id: "menu_bulk_add",
              name: "Bulk add delivery",
              description: "Paste many items at once",
            },
            {
              id: "menu_stock",
              name: "Check stock",
              description: "See what we have left",
            },
            {
              id: "menu_sales",
              name: "Today's sales",
              description: "What we've sold today",
            },
            {
              id: "menu_price",
              name: "Set a price",
              description: "e.g. milo is 8 cedis",
            },
            {
              id: "menu_alert",
              name: "Low stock alert",
              description: "Warn when stock is low",
            },
            {
              id: "menu_help",
              name: "Help",
              description: "Example messages",
            },
          ],
        },
      ],
    },
  });

  const bulkSid = await createTemplate("shop-bulk-instructions", {
    "twilio/text": { body: voice.bulkInstructions() },
  });

  console.log("\n--- Add these to your .env ---\n");
  console.log(`TWILIO_CONTENT_SID_WELCOME=${welcomeSid}`);
  console.log(`TWILIO_CONTENT_SID_MORE_MENU=${moreSid}`);
  console.log(`TWILIO_CONTENT_SID_BULK_HELP=${bulkSid}`);
  console.log("\nRestart npm start after saving .env");
}

main().catch((err) => {
  console.error(err.message);
  if (err.moreInfo) console.error(err.moreInfo);
  process.exit(1);
});
