const fs = require("fs");
const path = require("path");

function resolveEnvFilePath() {
  const root = process.cwd();
  const dotEnv = path.join(root, ".env");
  const dotEnvTxt = path.join(root, ".env.txt");

  if (fs.existsSync(dotEnv)) return dotEnv;
  if (fs.existsSync(dotEnvTxt)) {
    console.warn(
      "Using .env.txt — Windows often saves the file with a .txt extension. Rename to .env when you can."
    );
    return dotEnvTxt;
  }
  return dotEnv;
}

require("dotenv").config({ path: resolveEnvFilePath() });

const REQUIRED_FOR_SUPABASE = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const REQUIRED_FOR_SERVER = [
  ...REQUIRED_FOR_SUPABASE,
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_NUMBER",
  "ANTHROPIC_API_KEY",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing ${name} in your .env file. Copy .env.example to .env and fill in the value.`
    );
  }
  return value.trim();
}

function loadSupabaseEnv() {
  for (const name of REQUIRED_FOR_SUPABASE) {
    requireEnv(name);
  }

  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  };
}

function loadServerEnv() {
  for (const name of REQUIRED_FOR_SERVER) {
    requireEnv(name);
  }

  const publicWebhookBaseUrl = process.env.PUBLIC_WEBHOOK_BASE_URL?.trim() || "";

  const anthropicModel =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";

  return {
    ...loadSupabaseEnv(),
    twilioAccountSid: requireEnv("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: requireEnv("TWILIO_AUTH_TOKEN"),
    twilioWhatsappNumber: requireEnv("TWILIO_WHATSAPP_NUMBER"),
    publicWebhookBaseUrl,
    anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
    anthropicModel,
    contentSidWelcome: process.env.TWILIO_CONTENT_SID_WELCOME?.trim() || "",
    contentSidMoreMenu: process.env.TWILIO_CONTENT_SID_MORE_MENU?.trim() || "",
    contentSidBulkHelp: process.env.TWILIO_CONTENT_SID_BULK_HELP?.trim() || "",
  };
}

module.exports = { loadSupabaseEnv, loadServerEnv, requireEnv };
