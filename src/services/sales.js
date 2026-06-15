const { getSupabase } = require("./supabase");
const { getGhanaTodayStartIso } = require("../utils/ghanaDate");

async function recordSale({
  retailerId,
  productId,
  quantity,
  priceAtSale,
}) {
  const supabase = getSupabase();

  const { error } = await supabase.from("sales").insert({
    retailer_id: retailerId,
    product_id: productId,
    quantity_sold: quantity,
    price_at_sale: priceAtSale,
  });

  if (error) throw new Error(error.message);
}

async function getDailySales(retailerId, currency = "GHS") {
  const supabase = getSupabase();
  const since = getGhanaTodayStartIso();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      quantity_sold,
      price_at_sale,
      sold_at,
      products ( name, unit )
    `
    )
    .eq("retailer_id", retailerId)
    .gte("sold_at", since)
    .order("sold_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data || [];
  let totalRevenue = 0;
  let totalItems = 0;

  const lines = rows.map((row) => {
    const qty = Number(row.quantity_sold);
    const price = Number(row.price_at_sale);
    totalItems += qty;
    totalRevenue += price;
    const name = row.products?.name || "item";
    const unit = row.products?.unit ? ` ${row.products.unit}` : "";
    return `• ${qty}${unit} ${name} — ${currency} ${price.toFixed(2)}`;
  });

  return { lines, totalRevenue, totalItems, count: rows.length };
}

module.exports = { recordSale, getDailySales };
