const { getOrCreateProduct } = require("../services/products");
const {
  getOrCreateInventoryRow,
  updateStock,
  shouldShowLowStockAlert,
} = require("../services/inventory");
const voice = require("../copy/shop-voice");

async function addStockForProduct({
  retailerId,
  productName,
  quantity,
  unit,
  unitSellPrice,
  settings,
}) {
  const product = await getOrCreateProduct(
    retailerId,
    productName,
    unit,
    unitSellPrice
  );

  const invRow = await getOrCreateInventoryRow(retailerId, product.id);
  const current = Number(invRow.quantity_current);
  const newQty = current + quantity;

  const updated = await updateStock({
    retailerId,
    productId: product.id,
    newQuantity: newQty,
    logAction: "add",
  });

  const alert = shouldShowLowStockAlert(
    Number(updated.quantity_current),
    updated.low_stock_threshold != null
      ? Number(updated.low_stock_threshold)
      : null,
    settings.whatsapp_alerts_on
  );

  const displayUnit = unit || product.unit;
  let text = voice.addedStock({
    name: product.name,
    addedQty: quantity,
    unit: displayUnit,
    newQty,
    unitSellPrice: product.unitSellPrice,
    currency: settings.currency || "GHS",
  });

  if (alert) {
    text += `\n\n${voice.lowStockAlert({
      name: product.name,
      quantity: Number(updated.quantity_current),
      unit: displayUnit,
      threshold:
        updated.low_stock_threshold != null
          ? Number(updated.low_stock_threshold)
          : null,
    })}`;
  }

  return { text, product, newQty, unit: displayUnit };
}

module.exports = { addStockForProduct };
