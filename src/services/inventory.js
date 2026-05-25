const { getSupabase } = require("./supabase");

async function getOrCreateInventoryRow(retailerId, productId) {
  const supabase = getSupabase();

  const { data: existing, error: findError } = await supabase
    .from("inventory")
    .select("id, quantity_current, low_stock_threshold")
    .eq("retailer_id", retailerId)
    .eq("product_id", productId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("inventory")
    .insert({
      retailer_id: retailerId,
      product_id: productId,
      quantity_current: 0,
    })
    .select("id, quantity_current, low_stock_threshold")
    .single();

  if (createError) throw new Error(createError.message);
  return created;
}

async function writeInventoryLog({
  retailerId,
  productId,
  action,
  quantityBefore,
  quantityAfter,
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from("inventory_log").insert({
    retailer_id: retailerId,
    product_id: productId,
    action,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
  });

  if (error) throw new Error(error.message);
}

async function updateStock({
  retailerId,
  productId,
  newQuantity,
  logAction,
}) {
  const row = await getOrCreateInventoryRow(retailerId, productId);
  const before = Number(row.quantity_current);
  const after = newQuantity;

  const supabase = getSupabase();
  const { error } = await supabase
    .from("inventory")
    .update({ quantity_current: after })
    .eq("id", row.id);

  if (error) throw new Error(error.message);

  await writeInventoryLog({
    retailerId,
    productId,
    action: logAction,
    quantityBefore: before,
    quantityAfter: after,
  });

  const { data: updated } = await supabase
    .from("inventory")
    .select("quantity_current, low_stock_threshold")
    .eq("id", row.id)
    .single();

  return updated;
}

async function setLowStockThreshold(retailerId, productId, threshold) {
  const row = await getOrCreateInventoryRow(retailerId, productId);
  const supabase = getSupabase();

  const { error } = await supabase
    .from("inventory")
    .update({ low_stock_threshold: threshold })
    .eq("id", row.id);

  if (error) throw new Error(error.message);
}

async function listStock(retailerId, productName) {
  const supabase = getSupabase();

  let query = supabase
    .from("inventory")
    .select(
      `
      quantity_current,
      low_stock_threshold,
      products!inner ( id, name, unit, unit_sell_price, is_active )
    `
    )
    .eq("retailer_id", retailerId)
    .eq("products.is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data || [];
  if (productName) {
    const search = productName.trim().toLowerCase();
    rows = rows.filter((r) => {
      const name = r.products.name.trim().toLowerCase();
      return name === search || name.includes(search) || search.includes(name);
    });
  }

  return rows.map((r) => ({
    name: r.products.name,
    unit: r.products.unit,
    quantity: Number(r.quantity_current),
    unitSellPrice:
      r.products.unit_sell_price != null
        ? Number(r.products.unit_sell_price)
        : null,
    threshold:
      r.low_stock_threshold != null ? Number(r.low_stock_threshold) : null,
  }));
}

function buildLowStockAlert(productName, quantity, threshold, alertsOn) {
  if (!alertsOn || threshold == null) return null;
  if (quantity <= threshold) {
    return `Low stock alert: ${productName} is at ${quantity} (your alert level is ${threshold}).`;
  }
  return null;
}

module.exports = {
  getOrCreateInventoryRow,
  updateStock,
  setLowStockThreshold,
  listStock,
  buildLowStockAlert,
};
