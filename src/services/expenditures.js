const { getSupabase } = require("./supabase");
const { getGhanaTodayStartIso } = require("../utils/ghanaDate");

const VALID_CATEGORIES = new Set(["restock", "operational"]);

/**
 * Log a business expense (restock or operational).
 */
async function recordExpenditure({
  retailerId,
  phoneNumber,
  amount,
  category,
  description,
}) {
  const cat = VALID_CATEGORIES.has(category) ? category : "operational";
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("expenditures")
    .insert({
      retailer_id: retailerId,
      phone_number: phoneNumber,
      amount: Number(amount),
      category: cat,
      description: (description || "expense").trim().slice(0, 500),
    })
    .select("id, amount, category, description, recorded_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Sum and list today's expenditures for one retailer (Ghana business day).
 */
async function getDailyExpenditures(retailerId) {
  const supabase = getSupabase();
  const since = getGhanaTodayStartIso();

  const { data, error } = await supabase
    .from("expenditures")
    .select("amount, category, description, recorded_at")
    .eq("retailer_id", retailerId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data || [];
  let restockTotal = 0;
  let operationalTotal = 0;
  const restockLines = [];
  const operationalLines = [];

  for (const row of rows) {
    const amt = Number(row.amount);
    const desc = row.description || "expense";
    if (row.category === "restock") {
      restockTotal += amt;
      restockLines.push({ description: desc, amount: amt });
    } else {
      operationalTotal += amt;
      operationalLines.push({ description: desc, amount: amt });
    }
  }

  return {
    restockTotal,
    operationalTotal,
    totalExpenses: restockTotal + operationalTotal,
    count: rows.length,
    restockLines,
    operationalLines,
  };
}

module.exports = {
  recordExpenditure,
  getDailyExpenditures,
  VALID_CATEGORIES,
};
