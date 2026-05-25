const { getOrCreateRetailer, getRetailerSettings } = require("../services/retailer");
const { setSessionMode } = require("../services/session");
const { addStockForProduct } = require("./stock");
const voice = require("../copy/shop-voice");

async function executeBulkAdd(items, whatsappFrom) {
  const retailer = await getOrCreateRetailer(whatsappFrom);
  const settings = await getRetailerSettings(retailer.id);

  if (!items.length) {
    await setSessionMode(retailer.id, "idle");
    return {
      text: "I couldn't read any products in that message. Try one product per line, e.g.\n50 tins milo @ 8",
    };
  }

  const lines = [];
  let okCount = 0;

  for (const item of items) {
    try {
      const result = await addStockForProduct({
        retailerId: retailer.id,
        productName: item.product,
        quantity: item.quantity,
        unit: item.unit,
        unitSellPrice: item.price,
        settings,
      });
      okCount += 1;
      lines.push(
        voice.bulkSummaryOk({
          name: result.product.name,
          addedQty: item.quantity,
          unit: result.unit,
          newQty: result.newQty,
          unitSellPrice: result.product.unitSellPrice,
          currency: settings.currency || "GHS",
        })
      );
    } catch (err) {
      lines.push(
        voice.bulkSummaryFail({
          name: item.product,
          reason: err.message || "could not add",
        })
      );
    }
  }

  await setSessionMode(retailer.id, "idle");

  return {
    text:
      voice.bulkSummaryHeader(okCount, items.length) +
      lines.join("\n") +
      (okCount > 0 ? "\n\nNice — your stock is updated." : ""),
  };
}

module.exports = { executeBulkAdd };
