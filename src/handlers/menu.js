const voice = require("../copy/shop-voice");
const { executeAction } = require("./executeAction");
const { getOrCreateRetailer } = require("../services/retailer");
const { setSessionMode } = require("../services/session");

const GREETING_RE =
  /^(hi|hello|hey|hiya|good\s*(morning|afternoon|evening)|menu|start|help)$/i;

function isGreeting(text) {
  return GREETING_RE.test((text || "").trim());
}

function resolveMenuPayload(body) {
  const lower = (body || "").trim().toLowerCase();

  if (lower === "bulk add" || lower === "bulk add delivery" || lower === "bulk") {
    return "menu_bulk_add";
  }
  if (lower === "check stock" || lower === "stock") return "menu_stock";
  if (
    lower === "today's sales" ||
    lower === "todays sales" ||
    lower === "sales" ||
    lower === "cash flow" ||
    lower === "today's cash flow"
  ) {
    return "menu_sales";
  }
  if (
    lower === "my expenses" ||
    lower === "show my expenses" ||
    lower === "what did i spend today" ||
    lower === "expenses"
  ) {
    return "menu_expenses";
  }
  if (lower === "add stock") return "menu_add";
  if (lower === "record sale" || lower === "record a sale") return "menu_sale";
  if (lower === "set price" || lower === "set a price" || lower === "price") {
    return "menu_price";
  }
  if (
    lower === "low stock" ||
    lower === "set alert" ||
    lower === "stock alert"
  ) {
    return "menu_alert";
  }
  if (lower === "log expense" || lower === "log an expense") {
    return "menu_log_expense";
  }

  return null;
}

async function handleMenuAction(payload, whatsappFrom) {
  switch (payload) {
    case "menu_add":
      return { text: voice.menuAddHint() };

    case "menu_sale":
      return { text: voice.menuSaleHint() };

    case "menu_price":
      return { text: voice.menuPriceHint() };

    case "menu_alert":
      return { text: voice.menuAlertHint() };

    case "menu_log_expense":
      return { text: voice.menuExpenseHint() };

    case "menu_bulk_add": {
      const retailer = await getOrCreateRetailer(whatsappFrom);
      await setSessionMode(retailer.id, "awaiting_bulk_inventory");
      return { text: voice.bulkInstructions() };
    }

    case "menu_stock":
      return executeAction({ action: "check_stock", product: null }, whatsappFrom);

    case "menu_sales":
      return executeAction({ action: "daily_sales" }, whatsappFrom);

    case "menu_expenses":
      return executeAction({ action: "expense_summary" }, whatsappFrom);

    default:
      return null;
  }
}

async function handleGreeting(whatsappFrom) {
  return { text: voice.welcomeMessage() };
}

module.exports = {
  isGreeting,
  resolveMenuPayload,
  handleMenuAction,
  handleGreeting,
  GREETING_RE,
};
