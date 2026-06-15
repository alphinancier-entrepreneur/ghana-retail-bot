const express = require("express");
const { loadServerEnv } = require("./config/env");
const { checkSupabaseConnection } = require("./services/supabase");
const webhookRouter = require("./routes/webhook");

async function main() {
  const { port, nodeEnv } = loadServerEnv();

  await checkSupabaseConnection();
  console.log("Supabase: connected.");

  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "ghana-retail-bot",
      message: "Server is running. WhatsApp webhooks use POST /webhook/whatsapp",
      health: "/health",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ghana-retail-bot",
      commit: process.env.RENDER_GIT_COMMIT || null,
      replyMode: "twiml",
    });
  });

  app.use("/webhook", webhookRouter);

  const { publicWebhookBaseUrl, anthropicModel } = loadServerEnv();

  app.listen(port, "0.0.0.0", () => {
    console.log(`Ghana Retail Bot — menu, bulk entry, prices & shop voice`);
    console.log(`Claude model: ${anthropicModel}`);
    console.log(`Environment: ${nodeEnv}`);
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);

    if (
      publicWebhookBaseUrl &&
      !publicWebhookBaseUrl.includes("your-public-url")
    ) {
      console.log(
        `Twilio webhook (paste in sandbox): ${publicWebhookBaseUrl}/webhook/whatsapp`
      );
    } else {
      console.log(
        "Twilio webhook: set PUBLIC_WEBHOOK_BASE_URL in .env to your ngrok https URL"
      );
    }
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
