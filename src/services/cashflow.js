const { getDailySales } = require("./sales");
const { getDailyExpenditures } = require("./expenditures");

/**
 * Combine today's sales and expenditures for cash-flow reporting.
 */
async function getDailyCashFlow(retailerId, currency = "GHS") {
  const [sales, expenses] = await Promise.all([
    getDailySales(retailerId, currency),
    getDailyExpenditures(retailerId),
  ]);

  const income = sales.totalRevenue;
  const net = income - expenses.totalExpenses;

  return {
    sales,
    expenses,
    income,
    net,
  };
}

module.exports = { getDailyCashFlow };
