function formatMoney(amount, currency = "GHS") {
  if (amount == null || Number.isNaN(amount)) return null;
  if (currency === "GHS") return `GH₵ ${Number(amount).toFixed(2)}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

/** Ghana cedis display for cash-flow / expense copy */
function formatCedis(amount, currency = "GHS") {
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
    "Akwaaba! 👋 I'm Mariam — your shop assistant. While you handle your " +
    "customers, I'll handle the tracking — stock, sales, expenses, all of it, " +
    "right here on WhatsApp. What's your shop name?"
  );
}

function returningGreeting() {
  return "I'm here. Tell me a sale, a new stock, or an expense and I'll log it.";
}

function askShopName() {
  return "One more thing — what's your shop name? 🙌";
}

function shopNameSaved({ shopName }) {
  const label = shopName ? capitalize(shopName) : "your shop";
  return `${label} it is ✅ Let's keep your books straight.`;
}

function shopNameSkipped() {
  return "No problem — we can name your shop later. Let's get to work.";
}

function bulkInstructions() {
  return (
    "Paste your whole delivery in one message, one product per line.\n" +
    "You can include prices:\n" +
    "50 tins milo @ 8\n" +
    "20 boxes sugar @ 12\n" +
    "10 bag rice\n\n" +
    "Send it and I'll add everything at once 📦"
  );
}

function bulkParseFailed() {
  return (
    "I couldn't read any products there. One product per line, like:\n" +
    "50 tins milo @ 8"
  );
}

function helpMessage() {
  return (
    "I keep your books straight. You can tell me:\n" +
    "• add 20 tins of milo (new stock)\n" +
    "• sold 3 milo (a sale)\n" +
    "• milo is 8 cedis (set a price)\n" +
    "• what's in stock?\n" +
    "• today's sales\n" +
    "• I spent 50 cedis on transport\n" +
    "• alert me when milo is below 5\n" +
    "• bulk add (many items at once)\n" +
    "• delete my account (close your shop on Mariam)"
  );
}

function menuAddHint() {
  return (
    "Just tell me what came in — like:\n" +
    "add 20 tins of milo\n" +
    "add 10 boxes sugar @ 12\n\n" +
    "For many items at once, say: bulk add"
  );
}

function menuSaleHint() {
  return 'Say it like "sold 3 milo" or "sold 2 milo at 5 cedis each".';
}

function menuPriceHint() {
  return 'Say it like "milo is 8 cedis" or "set price of sugar to 12".';
}

function menuAlertHint() {
  return 'Say it like "alert me when milo is below 5".';
}

function menuExpenseHint() {
  return (
    "Just tell me what you spent — like:\n" +
    '"I spent 50 cedis on transport"\n' +
    '"bought goods worth 300 cedis"\n' +
    '"paid 120 for rent"'
  );
}

function expenseMissingHint() {
  return menuExpenseHint();
}

function stockLine({ name, quantity, unit, unitSellPrice, threshold, currency }) {
  const label = capitalize(name);
  let line = `• ${label} — ${quantity} ${unit} in stock`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) line += ` (${priceStr})`;
  if (threshold != null) line += ` — I'll warn you below ${threshold}`;
  return line;
}

function stockHeader(hasProductFilter) {
  return hasProductFilter ? "📦 Here's what you have:" : "📦 Here's your stock:";
}

function addedStock({ name, addedQty, unit, newQty, unitSellPrice, currency }) {
  const label = capitalize(name);
  let text = `${addedQty} ${unit} of ${label} added ✅ You now have ${newQty} ${unit}.`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) text += ` (${priceStr})`;
  return text;
}

function recordedSale({ name, quantity, unit, newQty, threshold }) {
  const label = capitalize(name);
  let text = `${label} sold ✅ ${newQty} ${unit} left.`;
  if (threshold != null && newQty <= threshold) {
    text += `\nThat's getting low — your minimum is ${threshold}.`;
  }
  return text;
}

function priceSet({ name, unitSellPrice, currency }) {
  return `Done ✅ ${capitalize(name)} is now ${formatUnitPrice(unitSellPrice, currency)}.`;
}

function thresholdSet({ name, threshold }) {
  return `Got it ✅ I'll flag ${capitalize(name)} when it drops to ${threshold} or below.`;
}

function lowStockAlert({ name, quantity, unit, threshold }) {
  return (
    `⚠️ ${capitalize(name)} is running low — ${quantity} ${unit} left and your ` +
    `minimum is ${threshold}. Time to restock.`
  );
}

function bulkSummaryHeader(okCount, total) {
  return `Done ✅ updated ${okCount} of ${total} line${total === 1 ? "" : "s"}:\n`;
}

function bulkSummaryOk({ name, addedQty, unit, newQty, unitSellPrice, currency }) {
  let line = `✅ ${capitalize(name)} — added ${addedQty} ${unit}, now ${newQty} ${unit}`;
  const priceStr = formatUnitPrice(unitSellPrice, currency);
  if (priceStr) line += ` (${priceStr})`;
  return line;
}

function bulkSummaryFail({ name, reason }) {
  return `⚠️ ${capitalize(name || "line")} — ${reason}`;
}

function expenseLoggedOperational({ amount, description, currency }) {
  const label = description ? capitalize(description) : "expense";
  return `Got it! ${formatCedis(amount, currency)} for ${label} recorded 📝`;
}

function expenseLoggedRestock({ amount, description, currency }) {
  const label = description ? capitalize(description) : "new stock";
  return (
    `Restock recorded ✅ ${formatCedis(amount, currency)} spent on ${label}. ` +
    "Don't forget to update your inventory if you added new items!"
  );
}

function summaryClosing() {
  return "Good day. Your shop worked hard.";
}

function dailyCashFlowSummary({
  income,
  restockTotal,
  operationalTotal,
  net,
  currency,
  salesCount,
  expenseCount,
  period = "Today's",
}) {
  const hasActivity = salesCount > 0 || expenseCount > 0;
  if (!hasActivity) {
    return "No sales or expenses recorded today yet.";
  }

  return (
    `📊 ${period} Summary\n` +
    `💰 Sales: ${formatCedis(income, currency)}\n` +
    `📦 Restock: ${formatCedis(restockTotal, currency)}\n` +
    `🏃 Operations: ${formatCedis(operationalTotal, currency)}\n` +
    "─────────────────\n" +
    `📈 Net: ${formatCedis(net, currency)}\n\n` +
    summaryClosing()
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
    return "No expenses recorded today yet.";
  }

  let text = "📊 Today's spending\n\n";

  if (restockLines.length) {
    text += `📦 Restock — ${formatCedis(restockTotal, currency)}:\n`;
    for (const line of restockLines) {
      text += `• ${capitalize(line.description)} — ${formatCedis(line.amount, currency)}\n`;
    }
    text += "\n";
  }

  if (operationalLines.length) {
    text += `🏃 Operations — ${formatCedis(operationalTotal, currency)}:\n`;
    for (const line of operationalLines) {
      text += `• ${capitalize(line.description)} — ${formatCedis(line.amount, currency)}\n`;
    }
    text += "\n";
  }

  text += `Total spent today: ${formatCedis(totalExpenses, currency)}\n\n`;
  text += summaryClosing();
  return text.trim();
}

function unknownIntent() {
  return (
    "Hmm, I didn't quite catch that. Did you want to record a sale, check your " +
    "stock, or log an expense?"
  );
}

function outOfScope() {
  return (
    "That's a bit outside what I know 😄 I'm best at stock, sales, and keeping " +
    "your books straight. Want help with any of those?"
  );
}

function thankYou() {
  return "Always 🙌 Your shop won't run itself.";
}

function noProductYet({ productName }) {
  return (
    `You don't have ${productName} in the shop yet. Add it first — like: ` +
    `add 10 ${productName}.`
  );
}

function notEnoughStock({ name, current, tried, unit }) {
  return (
    `⚠️ Not enough ${name} for that sale. You have ${current} ${unit}, not ${tried}.`
  );
}

function emptyShop() {
  return "Nothing in stock yet. Add your first items — like: add 20 tins of milk.";
}

function noStockMatch({ productName }) {
  return `I couldn't find ${productName} in your stock list.`;
}

function rateLimitError() {
  return (
    "This WhatsApp line hit its daily message limit, so replies are paused for now.\n\n" +
    "Everything you sent is saved — nothing lost. Try again in a few hours."
  );
}

function handlerError() {
  return "Something went wrong on my end — try that again in a sec.";
}

function deleteAccountConfirm() {
  return (
    "You want to close your Mariam account?\n\n" +
    "Your shop will be disconnected and your products hidden. " +
    "Past sales records stay in our system — you won't see them from this WhatsApp.\n\n" +
    "Reply DELETE to confirm, or CANCEL to keep your account.\n\n" +
    "Nothing happens until you reply DELETE."
  );
}

function deleteAccountReminder() {
  return (
    "Still waiting — reply DELETE to close your account, or CANCEL to go back.\n\n" +
    "Nothing is deleted until you send DELETE."
  );
}

function deleteAccountDone() {
  return (
    "Done ✅ Your account is closed.\n\n" +
    "You can message from this same number anytime to start a fresh shop — " +
    "Mariam will set you up again."
  );
}

function deleteAccountCancelled() {
  return "Okay — your account stays. Nothing changed.";
}

module.exports = {
  welcomeMessage,
  returningGreeting,
  askShopName,
  shopNameSaved,
  shopNameSkipped,
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
  outOfScope,
  thankYou,
  noProductYet,
  notEnoughStock,
  emptyShop,
  noStockMatch,
  rateLimitError,
  handlerError,
  deleteAccountConfirm,
  deleteAccountReminder,
  deleteAccountDone,
  deleteAccountCancelled,
  formatMoney,
  formatCedis,
  formatUnitPrice,
};
