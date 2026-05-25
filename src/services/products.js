const { getSupabase } = require("./supabase");

const PRODUCT_FIELDS = "id, name, unit, unit_sell_price, is_active";

async function findActiveProduct(retailerId, productName) {
  const supabase = getSupabase();
  const search = productName.trim().toLowerCase();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("retailer_id", retailerId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  const exact = data.find((p) => p.name.trim().toLowerCase() === search);
  if (exact) return mapProduct(exact);

  const partial = data.find((p) =>
    p.name.trim().toLowerCase().includes(search)
  );
  if (partial) return mapProduct(partial);

  const reverse = data.find((p) =>
    search.includes(p.name.trim().toLowerCase())
  );
  return reverse ? mapProduct(reverse) : null;
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    unitSellPrice:
      row.unit_sell_price != null ? Number(row.unit_sell_price) : null,
  };
}

async function createProduct(retailerId, name, unit, unitSellPrice = null) {
  const supabase = getSupabase();
  const insert = {
    retailer_id: retailerId,
    name: name.trim(),
    unit: unit || "piece",
  };
  if (unitSellPrice != null) {
    insert.unit_sell_price = unitSellPrice;
  }

  const { data, error } = await supabase
    .from("products")
    .insert(insert)
    .select(PRODUCT_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return findActiveProduct(retailerId, name);
    }
    throw new Error(error.message);
  }

  return mapProduct(data);
}

async function setProductPrice(productId, unitSellPrice) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .update({ unit_sell_price: unitSellPrice })
    .eq("id", productId)
    .select(PRODUCT_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

async function getOrCreateProduct(retailerId, productName, unit, unitSellPrice = null) {
  const found = await findActiveProduct(retailerId, productName);
  if (found) {
    if (unitSellPrice != null && found.unitSellPrice !== unitSellPrice) {
      return setProductPrice(found.id, unitSellPrice);
    }
    return found;
  }
  return createProduct(retailerId, productName, unit, unitSellPrice);
}

module.exports = {
  findActiveProduct,
  createProduct,
  getOrCreateProduct,
  setProductPrice,
};
