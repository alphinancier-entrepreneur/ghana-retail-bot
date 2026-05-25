/**
 * Test Anthropic API key and model. Run: node scripts/verify-claude.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const Anthropic = require("@anthropic-ai/sdk");

const key = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";

async function main() {
  console.log("Model:", model);
  console.log(
    "API key:",
    key ? `${key.slice(0, 12)}...${key.slice(-4)} (length ${key.length})` : "MISSING"
  );

  if (!key || key.includes("xxxxxxxx")) {
    console.error("Set a real ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 64,
      messages: [{ role: "user", content: 'Reply with only: {"ok":true}' }],
    });
    const text = response.content.find((b) => b.type === "text")?.text;
    console.log("API call: OK");
    console.log("Response:", text);
  } catch (err) {
    console.error("API call: FAILED");
    console.error("Status:", err.status);
    console.error("Message:", err.message);
    if (err.error) console.error("Details:", JSON.stringify(err.error, null, 2));
    process.exit(1);
  }
}

main();
