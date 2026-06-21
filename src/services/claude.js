const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("../prompts/retail-assistant");
const { WRITER_SYSTEM_PROMPT } = require("../prompts/mariam-writer");
const { BULK_SYSTEM_PROMPT } = require("../prompts/bulk-inventory");
const { loadServerEnv } = require("../config/env");

const ALLOWED_ACTIONS = new Set([
  "add_inventory",
  "record_sale",
  "check_stock",
  "daily_sales",
  "expense_summary",
  "log_expense",
  "set_threshold",
  "set_price",
  "out_of_scope",
  "unknown",
]);

const ALLOWED_EXPENSE_CATEGORIES = new Set(["restock", "operational"]);

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

  const expenseCategory = ALLOWED_EXPENSE_CATEGORIES.has(raw?.expense_category)
    ? raw.expense_category
    : null;

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
    expenseCategory,
    expenseDescription:
      typeof raw?.expense_description === "string"
        ? raw.expense_description.trim()
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

function stripWrappers(text) {
  let out = (text || "").trim();
  // Strip code fences and surrounding quotes the model sometimes adds.
  out = out.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

/**
 * Second-stage writer: turn computed facts into Mariam's prose.
 * Resolves to the generated text, or throws on timeout/empty/error so the
 * caller can fall back to a template.
 */
async function generateProse(userContent, { maxTokens = 200, timeoutMs = 4000 } = {}) {
  const work = callClaude(WRITER_SYSTEM_PROMPT, userContent, maxTokens);
  const text = await Promise.race([
    work,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("writer timeout")), timeoutMs)
    ),
  ]);
  const clean = stripWrappers(text);
  if (!clean) throw new Error("writer returned empty text");
  return clean;
}

async function parseRetailerMessage(userMessage) {
  const text = await callClaude(SYSTEM_PROMPT, userMessage);
  const parsed = normalizeParsed(extractJson(text));
  if (process.env.NODE_ENV === "production") {
    console.log("Claude action:", parsed.action);
  } else {
    console.log("Claude parsed:", JSON.stringify(parsed));
  }
  return parsed;
}

async function parseBulkInventoryMessage(userMessage) {
  const text = await callClaude(BULK_SYSTEM_PROMPT, userMessage, 1024);
  const raw = extractJson(text);
  const items = Array.isArray(raw?.items)
    ? raw.items.map(normalizeBulkItem).filter((i) => i.product && i.quantity != null)
    : [];

  if (process.env.NODE_ENV === "production") {
    console.log("Claude bulk items:", items.length);
  } else {
    console.log("Claude bulk parsed:", items.length, "items");
  }
  return { action: "bulk_add_inventory", items: items.slice(0, 30) };
}

module.exports = {
  parseRetailerMessage,
  parseBulkInventoryMessage,
  generateProse,
  ALLOWED_ACTIONS,
};
