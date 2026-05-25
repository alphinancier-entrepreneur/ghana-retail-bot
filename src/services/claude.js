const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("../prompts/retail-assistant");
const { BULK_SYSTEM_PROMPT } = require("../prompts/bulk-inventory");
const { loadServerEnv } = require("../config/env");

const ALLOWED_ACTIONS = new Set([
  "add_inventory",
  "record_sale",
  "check_stock",
  "daily_sales",
  "set_threshold",
  "set_price",
  "unknown",
]);

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

let client = null;

function getClaudeClient() {
  if (client) return client;
  const { anthropicApiKey } = loadServerEnv();
  client = new Anthropic({ apiKey: anthropicApiKey });
  return client;
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Claude did not return valid JSON");
  }
}

function normalizeParsed(raw) {
  const action = ALLOWED_ACTIONS.has(raw?.action) ? raw.action : "unknown";

  return {
    action,
    product: typeof raw?.product === "string" ? raw.product.trim() : null,
    quantity:
      typeof raw?.quantity === "number" && !Number.isNaN(raw.quantity)
        ? raw.quantity
        : null,
    unit: typeof raw?.unit === "string" ? raw.unit.trim() : null,
    threshold:
      typeof raw?.threshold === "number" && !Number.isNaN(raw.threshold)
        ? raw.threshold
        : null,
    price:
      typeof raw?.price === "number" && !Number.isNaN(raw.price)
        ? raw.price
        : null,
  };
}

function normalizeBulkItem(raw) {
  return {
    product: typeof raw?.product === "string" ? raw.product.trim() : null,
    quantity:
      typeof raw?.quantity === "number" && !Number.isNaN(raw.quantity)
        ? raw.quantity
        : null,
    unit: typeof raw?.unit === "string" ? raw.unit.trim() : null,
    price:
      typeof raw?.price === "number" && !Number.isNaN(raw.price)
        ? raw.price
        : null,
  };
}

async function callClaude(system, userMessage, maxTokens = 256) {
  const { anthropicModel } = loadServerEnv();
  const anthropic = getClaudeClient();

  const response = await anthropic.messages.create({
    model: anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("Claude returned an empty response");
  }
  return textBlock.text;
}

async function parseRetailerMessage(userMessage) {
  const text = await callClaude(SYSTEM_PROMPT, userMessage);
  const parsed = normalizeParsed(extractJson(text));
  console.log("Claude parsed:", JSON.stringify(parsed));
  return parsed;
}

async function parseBulkInventoryMessage(userMessage) {
  const text = await callClaude(BULK_SYSTEM_PROMPT, userMessage, 1024);
  const raw = extractJson(text);
  const items = Array.isArray(raw?.items)
    ? raw.items.map(normalizeBulkItem).filter((i) => i.product && i.quantity != null)
    : [];

  console.log("Claude bulk parsed:", items.length, "items");
  return { action: "bulk_add_inventory", items: items.slice(0, 30) };
}

module.exports = {
  parseRetailerMessage,
  parseBulkInventoryMessage,
  ALLOWED_ACTIONS,
};
