function formatMoney(amount, currency = "GHS") {
  if (amount == null || Number.isNaN(amount)) return null;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

/** Ghana cedis display for cash-flow / expense copy */
function formatCedis(amount, currency = "GHS") {
  if (amount == null || Number.isNaN(amount)) return null;
  if (currency === "GHS") return `GH₵ ${Number(amount).toFixed(2)}`;
  return formatMoney(amount, currency);
}

function formatUnitPrice(price, currency = "GHS") {
  if (price == null) return null;
  return `${formatMoney(price, currency)} each`;
}

function capitalize(name) {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function welcomeMessage() {
  return (
    "hey — i'm your shop assistant. i track stock and sales for you over WhatsApp.\n\n" +
    "here are some examples of what you can tell me:\n" +
    "• what's in stock?\n" +
    "• add 20 tins of milo\n" +
    "• milo is 8 cedis (set a price)\n" +
    "• sold 3 milo\n" +
    "• today's sales / cash flow\n" +
    "• i spent 50 cedis on transport\n" +
    "• alert me when milo is below 5\n\n" +
    "for bulk recording, say 'bulk add' and i'll walk you through it."
  );
}

function bulkInstructions() {
  return (
    "paste your whole delivery in one message, one product per line.\n" +
    "you can include prices:\n" +
    "50 tins milo @ 8\n" +
    "20 boxes sugar @ 12\n" +
    "10 bag rice\n\n" +
    "send it and i'll add everything in one go."
  );
}

function bulkParseFailed() {
  return (
    "couldn't read any products in that message. try one product per line, e.g.\n" +
    "50 tins milo @ 8"
  );
}

function helpMessage() {
  return (
    "here's what i can help with:\n" +
    "• record inventory (e.g. add 20 tins of milk)\n" +
    "• record sales (e.g. sold 3 milo)\n" +
    "• set prices (e.g. milo is 8 cedis)\n" +
    "• stock report (e.g. what's in stock?)\n" +
    "• sales / cash flow (e.g. today's sales)\n" +
    "• log expenses (e.g. i spent 50 cedis on transport)\n" +
    "• expense report (e.g. what did i spend today?)\n" +
    "• set inventory watchdog (e.g. alert me when milo is below 5)\n" +
    "• bulk add (many items in one message)"
  );
}

function menuAddHint() {
  return (
    "just say what came in — for example:\n" +
    "add 20 tins of milo\n" +
    "add 10 boxes sugar @ 12\n\n" +
    "for many items at once, say: bulk add"
  );
}

function menuSaleHint() {
  return 'just say it like: "sold 3 milo" or "sold 2 milo at 5 cedis each".';
}

function menuPriceHint() {
  return 'just say it — for example: "milo is 8 cedis" or "set price of sugar to 12".';
}

function menuAlertHint() {
  return 'just say it — for example: "alert me when milo is below 5".';
}

function menuExpenseHint() {
  return (
    'just say what you spent — for example:\n' +
    '"i spent 50 cedis on transport"\n' +
    '"bought goods worth 300 cedis"\n' +
    '"paid 120 for rent"'
  );
}

function expenseMissingHint() {
  return menuExpenseHint();
}

function stockLine({ name, quantity, unit, unitSellPrice, threshold, currency }) {
  const label = capitalize(name);
  let line = `• ${label} — we have ${quantity} ${unit} in stock`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) line += ` (${priceStr})`;
  if (threshold != null) line += ` — we'll warn you below ${threshold}`;
  return line;
}

function stockHeader(hasProductFilter) {
  return hasProductFilter ? "here's what we have:" : "here's what we have in stock:";
}

function addedStock({ name, addedQty, unit, newQty, unitSellPrice, currency }) {
  const label = capitalize(name);
  let text = `done — ${addedQty} ${unit} of ${label} added.\nyou now have ${newQty} ${unit} in total.`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) text += ` (${priceStr})`;
  return text;
}

function recordedSale({
  name,
  quantity,
  unit,
  newQty,
  priceAtSale,
  unitSellPrice,
  currency,
}) {
  const label = capitalize(name);
  let text = `got it — ${quantity} ${label} sold.`;
  if (priceAtSale > 0) {
    text += ` that's ${formatMoney(priceAtSale, currency)}.`;
  } else if (unitSellPrice == null) {
    text += ` no price saved for ${label} yet — say "${name} is 8 cedis" to set one.`;
  }
  text += `\nyou have ${newQty} ${unit} left.`;
  return text;
}

function priceSet({ name, unitSellPrice, currency }) {
  return `done — ${capitalize(name)} is now ${formatUnitPrice(unitSellPrice, currency)}.`;
}

function thresholdSet({ name, threshold }) {
  return `got it — i'll let you know when ${capitalize(name)} drops to ${threshold} or below.`;
}

function lowStockAlert({ name, quantity, unit, threshold }) {
  return `heads up — ${name} is running low. only ${quantity} ${unit} left (alert set at ${threshold}).`;
}

function bulkSummaryHeader(okCount, total) {
  return `done — updated ${okCount} of ${total} line${total === 1 ? "" : "s"}:\n`;
}

function bulkSummaryOk({ name, addedQty, unit, newQty, unitSellPrice, currency }) {
  let line = `✓ ${capitalize(name)} — added ${addedQty} ${unit}. you now have ${newQty} ${unit}`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) line += ` (${priceStr})`;
  return line;
}

function bulkSummaryFail({ name, reason }) {
  return `✗ ${capitalize(name || "line")} — ${reason}`;
}

function expenseLoggedOperational({
  amount,
  description,
  todayTotal,
  currency,
}) {
  const label = description ? capitalize(description) : "expense";
  return (
    `got it — ${formatCedis(amount, currency)} for ${label} logged as a business expense 📝\n` +
    `running total spent today: ${formatCedis(todayTotal, currency)}`
  );
}

function expenseLoggedRestock({ amount, description, currency }) {
  const label = description ? capitalize(description) : "new stock";
  return (
    `restock recorded ✅ ${formatCedis(amount, currency)} spent on ${label}.\n` +
    `don't forget to update your inventory if you added new items!`
  );
}

function dailyCashFlowSummary({
  income,
  restockTotal,
  operationalTotal,
  net,
  currency,
  salesCount,
  expenseCount,
}) {
  const hasActivity = salesCount > 0 || expenseCount > 0;
  if (!hasActivity) {
    return "no sales or expenses recorded today yet.";
  }

  return (
    "📊 today's cash flow\n" +
    `💰 sales: ${formatCedis(income, currency)}\n` +
    `📦 restock: ${formatCedis(restockTotal, currency)}\n` +
    `🏃 operations: ${formatCedis(operationalTotal, currency)}\n` +
    "─────────────────\n" +
    `📈 net: ${formatCedis(net, currency)}`
  );
}

function expenseSummary({
  restockTotal,
  operationalTotal,
  totalExpenses,
  restockLines,
  operationalLines,
  currency,
}) {
  if (totalExpenses === 0) {
    return "no expenses recorded today yet.";
  }

  let text = "📝 today's spending\n\n";

  if (restockLines.length) {
    text += `📦 restock — ${formatCedis(restockTotal, currency)}:\n`;
    for (const line of restockLines) {
      text += `• ${capitalize(line.description)} — ${formatCedis(line.amount, currency)}\n`;
    }
    text += "\n";
  }

  if (operationalLines.length) {
    text += `🏃 operations — ${formatCedis(operationalTotal, currency)}:\n`;
    for (const line of operationalLines) {
      text += `• ${capitalize(line.description)} — ${formatCedis(line.amount, currency)}\n`;
    }
    text += "\n";
  }

  text += `total spent today: ${formatCedis(totalExpenses, currency)}`;
  return text.trim();
}

function unknownIntent() {
  return helpMessage();
}

function noProductYet({ productName }) {
  return (
    `we don't have ${productName} in the shop yet. ` +
    `add stock first — for example: add 10 ${productName}.`
  );
}

function notEnoughStock({ name, current, tried, unit }) {
  return (
    `we don't have enough ${name} for that sale. ` +
    `we only have ${current} ${unit} in stock, not ${tried}.`
  );
}

function emptyShop() {
  return (
    "we don't have anything in stock yet. " +
    "add your first items — for example: add 20 tins of milk."
  );
}

function noStockMatch({ productName }) {
  return `we couldn't find ${productName} in our stock list.`;
}

function rateLimitError() {
  return (
    "hit the daily message limit on this WhatsApp line, so replies are paused for now 😅\n\n" +
    "everything you sent is saved — nothing lost.\n" +
    "try again in a few hours (the limit usually resets within 24 hours)."
  );
}

function handlerError() {
  return "something went wrong on my end — try again in a sec.";
}

module.exports = {
  welcomeMessage,
  bulkInstructions,
  bulkParseFailed,
  helpMessage,
  menuAddHint,
  menuSaleHint,
  menuPriceHint,
  menuAlertHint,
  menuExpenseHint,
  expenseMissingHint,
  stockLine,
  stockHeader,
  addedStock,
  recordedSale,
  priceSet,
  thresholdSet,
  lowStockAlert,
  bulkSummaryHeader,
  bulkSummaryOk,
  bulkSummaryFail,
  expenseLoggedOperational,
  expenseLoggedRestock,
  dailyCashFlowSummary,
  expenseSummary,
  unknownIntent,
  noProductYet,
  notEnoughStock,
  emptyShop,
  noStockMatch,
  rateLimitError,
  handlerError,
  formatMoney,
  formatCedis,
};
