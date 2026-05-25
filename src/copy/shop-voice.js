function formatMoney(amount, currency = "GHS") {
  if (amount == null || Number.isNaN(amount)) return null;
  return `${currency} ${Number(amount).toFixed(2)}`;
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
    "hey — I'm your shop assistant. I track stock and sales for you over WhatsApp.\n\n" +
    "here are some examples of what you can tell me:\n" +
    "• add 20 tins of milo\n" +
    "• sold 3 milo\n" +
    "• milo is 8 cedis (set a price)\n" +
    "• what's in stock?\n" +
    "• today's sales\n" +
    "• alert me when milo is below 5\n\n" +
    "for bulk recording, say 'bulk add' and I'll walk you through it."
  );
}

function bulkInstructions() {
  return (
    "Paste your whole delivery in one message, one product per line.\n" +
    "You can include prices:\n" +
    "50 tins milo @ 8\n" +
    "20 boxes sugar @ 12\n" +
    "10 bag rice\n\n" +
    "Send it and I'll add everything in one go."
  );
}

function helpMessage() {
  return (
    "Here's what I can help with:\n" +
    "• record inventory, (e.g. add 20 tins of milk)\n" +
    "• record sales, (e.g. sold 3 milo)\n" +
    "• set prices, (e.g. milo is 8 cedis)\n" +
    "• stock report, (e.g. what's in stock?)\n" +
    "• sales report, (e.g. today's sales)\n" +
    "• set inventory watchdog, (e.g. alert me when milo is below 5)\n" +
    "• bulk add (add many items at once, instead of sending them as separate messages)"
  );
}

function menuAddHint() {
  return (
    "Just say what came in — for example:\n" +
    "add 20 tins of milo\n" +
    "add 10 boxes sugar @ 12\n\n" +
    "For many items at once, say: bulk add"
  );
}

function menuSaleHint() {
  return 'Just say it like: "sold 3 milo" or "sold 2 milo at 5 cedis each".';
}

function menuPriceHint() {
  return 'Just say it — for example: "milo is 8 cedis" or "set price of sugar to 12".';
}

function menuAlertHint() {
  return 'Just say it — for example: "alert me when milo is below 5".';
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
  let text = `Got it — ${quantity} ${label} sold.`;
  if (priceAtSale > 0) {
    text += ` That's ${formatMoney(priceAtSale, currency)}.`;
  } else if (unitSellPrice == null) {
    text += ` No price saved for ${label} yet — say "${name} is 8 cedis" to set one.`;
  }
  text += `\nYou have ${newQty} ${unit} left.`;
  return text;
}

function priceSet({ name, unitSellPrice, currency }) {
  return `Done — ${capitalize(name)} is now ${formatUnitPrice(unitSellPrice, currency)}.`;
}

function thresholdSet({ name, threshold }) {
  return `Got it — I'll let you know when ${capitalize(name)} drops to ${threshold} or below.`;
}

function lowStockAlert({ name, quantity, unit, threshold }) {
  return `heads up — ${name} is running low. only ${quantity} ${unit} left (alert set at ${threshold}).`;
}

function bulkSummaryHeader(okCount, total) {
  return `done — updated ${okCount} of ${total} line${total === 1 ? "" : "s"}:\n`;
}

function bulkSummaryOk({ name, addedQty, unit, newQty, unitSellPrice, currency }) {
  let line = `✓ ${capitalize(name)} — added ${addedQty} ${unit}. We now have ${newQty} ${unit}`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) line += ` (${priceStr})`;
  return line;
}

function bulkSummaryFail({ name, reason }) {
  return `✗ ${capitalize(name || "line")} — ${reason}`;
}

function dailySalesSummary({ lines, totalRevenue, totalItems, count, currency }) {
  if (count === 0) {
    return "no sales recorded today yet.";
  }
  return (
    `today's sales — ${count} transaction${count === 1 ? "" : "s"}:\n` +
    lines.join("\n") +
    `\n\ntotal: ${totalItems} items, ${formatMoney(totalRevenue, currency)}.`
  );
}

function unknownIntent() {
  return helpMessage();
}

function noProductYet({ productName }) {
  return (
    `We don't have ${productName} in the shop yet. ` +
    `Add stock first — for example: add 10 ${productName}.`
  );
}

function notEnoughStock({ name, current, tried, unit }) {
  return (
    `We don't have enough ${name} for that sale. ` +
    `We only have ${current} ${unit} in stock, not ${tried}.`
  );
}

function emptyShop() {
  return (
    "We don't have anything in stock yet. " +
    "Add your first items — for example: add 20 tins of milk."
  );
}

function noStockMatch({ productName }) {
  return `We couldn't find ${productName} in our stock list.`;
}

function rateLimitError() {
  return (
    "hit my daily message limit, so replies are paused for now 😅\n\n" +
    "everything you sent is saved — nothing lost.\n" +
    "try again in a few hours and i'll be back."
  );
}

function handlerError() {
  return "something went wrong on my end — try again in a sec.";
}

function claudeError() {
  return "didn't quite catch that — try again?";
}

module.exports = {
  welcomeMessage,
  bulkInstructions,
  helpMessage,
  menuAddHint,
  menuSaleHint,
  menuPriceHint,
  menuAlertHint,
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
  dailySalesSummary,
  unknownIntent,
  noProductYet,
  notEnoughStock,
  emptyShop,
  noStockMatch,
  rateLimitError,
  handlerError,
  claudeError,
  formatMoney,
};
