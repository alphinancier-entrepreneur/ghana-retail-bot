const {
  getOrCreateRetailer,
  getRetailerSettings,
  normalizeWhatsAppPhone,
} = require("../services/retailer");
const {
  findActiveProduct,
  setProductPrice,
} = require("../services/products");
const {
  updateStock,
  setLowStockThreshold,
  listStock,
} = require("../services/inventory");
const { recordSale } = require("../services/sales");
const { recordExpenditure, getDailyExpenditures } = require("../services/expenditures");
const { getDailyCashFlow } = require("../services/cashflow");
const { addStockForProduct } = require("./stock");
const voice = require("../copy/shop-voice");

function resolveSaleTotal(parsed, product) {
  if (parsed.price != null && parsed.quantity != null) {
    return Number(parsed.price) * Number(parsed.quantity);
  }
  if (parsed.price != null) return Number(parsed.price);
  if (product?.unitSellPrice != null && parsed.quantity != null) {
    return product.unitSellPrice * parsed.quantity;
  }
  return 0;
}

async function executeAction(parsed, whatsappFrom) {
  if (parsed.action === "unknown") {
    return { text: voice.unknownIntent() };
  }

  const retailer = await getOrCreateRetailer(whatsappFrom);
  const settings = await getRetailerSettings(retailer.id);
  const currency = settings.currency || "GHS";

  switch (parsed.action) {
    case "add_inventory": {
      if (!parsed.product || parsed.quantity == null) {
        return { text: voice.menuAddHint() };
      }

      const result = await addStockForProduct({
        retailerId: retailer.id,
        productName: parsed.product,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unitSellPrice: parsed.price,
        settings,
      });
      return { text: result.text };
    }

    case "record_sale": {
      if (!parsed.product || parsed.quantity == null) {
        return { text: voice.menuSaleHint() };
      }

      const product = await findActiveProduct(retailer.id, parsed.product);
      if (!product) {
        return { text: voice.noProductYet({ productName: parsed.product }) };
      }

      const stockRows = await listStock(retailer.id, product.name);
      const current = stockRows[0]?.quantity ?? 0;

      if (current < parsed.quantity) {
        return {
          text: voice.notEnoughStock({
            name: product.name,
            current,
            tried: parsed.quantity,
            unit: product.unit,
          }),
        };
      }

      const newQty = current - parsed.quantity;
      const priceAtSale = resolveSaleTotal(parsed, product);

      const updated = await updateStock({
        retailerId: retailer.id,
        productId: product.id,
        newQuantity: newQty,
        logAction: "sale",
      });

      await recordSale({
        retailerId: retailer.id,
        productId: product.id,
        quantity: parsed.quantity,
        priceAtSale,
      });

      let text = voice.recordedSale({
        name: product.name,
        quantity: parsed.quantity,
        unit: product.unit,
        newQty,
        priceAtSale,
        unitSellPrice: product.unitSellPrice,
        currency,
      });

      if (
        settings.whatsapp_alerts_on &&
        updated.low_stock_threshold != null &&
        newQty <= Number(updated.low_stock_threshold)
      ) {
        text += `\n\n${voice.lowStockAlert({
          name: product.name,
          quantity: newQty,
          unit: product.unit,
          threshold: Number(updated.low_stock_threshold),
        })}`;
      }

      return { text };
    }

    case "check_stock": {
      const rows = await listStock(retailer.id, parsed.product);
      if (!rows.length) {
        return parsed.product
          ? { text: voice.noStockMatch({ productName: parsed.product }) }
          : { text: voice.emptyShop() };
      }

      const lines = rows.map((r) =>
        voice.stockLine({
          name: r.name,
          quantity: r.quantity,
          unit: r.unit,
          unitSellPrice: r.unitSellPrice,
          threshold: r.threshold,
          currency,
        })
      );

      return {
        text: `${voice.stockHeader(!!parsed.product)}\n${lines.join("\n")}`,
      };
    }

    case "daily_sales": {
      const flow = await getDailyCashFlow(retailer.id, currency);
      return {
        text: voice.dailyCashFlowSummary({
          income: flow.income,
          restockTotal: flow.expenses.restockTotal,
          operationalTotal: flow.expenses.operationalTotal,
          net: flow.net,
          currency,
          salesCount: flow.sales.count,
          expenseCount: flow.expenses.count,
        }),
      };
    }

    case "expense_summary": {
      const expenses = await getDailyExpenditures(retailer.id);
      return {
        text: voice.expenseSummary({
          restockTotal: expenses.restockTotal,
          operationalTotal: expenses.operationalTotal,
          totalExpenses: expenses.totalExpenses,
          restockLines: expenses.restockLines,
          operationalLines: expenses.operationalLines,
          currency,
        }),
      };
    }

    case "log_expense": {
      if (parsed.price == null || parsed.price <= 0) {
        return { text: voice.expenseMissingHint() };
      }

      const phone = normalizeWhatsAppPhone(whatsappFrom);
      const category = parsed.expenseCategory || "operational";
      const description =
        parsed.expenseDescription ||
        (category === "restock" ? "restock" : "business expense");

      await recordExpenditure({
        retailerId: retailer.id,
        phoneNumber: phone,
        amount: parsed.price,
        category,
        description,
      });

      const today = await getDailyExpenditures(retailer.id);

      if (category === "restock") {
        return {
          text: voice.expenseLoggedRestock({
            amount: parsed.price,
            description,
            currency,
          }),
        };
      }

      return {
        text: voice.expenseLoggedOperational({
          amount: parsed.price,
          description,
          todayTotal: today.totalExpenses,
          currency,
        }),
      };
    }

    case "set_threshold": {
      if (!parsed.product || parsed.threshold == null) {
        return { text: voice.menuAlertHint() };
      }

      const product = await findActiveProduct(retailer.id, parsed.product);
      if (!product) {
        return { text: voice.noProductYet({ productName: parsed.product }) };
      }

      await setLowStockThreshold(retailer.id, product.id, parsed.threshold);

      return {
        text: voice.thresholdSet({ name: product.name, threshold: parsed.threshold }),
      };
    }

    case "set_price": {
      if (!parsed.product || parsed.price == null) {
        return { text: voice.menuPriceHint() };
      }

      let product = await findActiveProduct(retailer.id, parsed.product);
      if (!product) {
        const { getOrCreateProduct } = require("../services/products");
        product = await getOrCreateProduct(
          retailer.id,
          parsed.product,
          parsed.unit,
          parsed.price
        );
      } else {
        product = await setProductPrice(product.id, parsed.price);
      }

      return {
        text: voice.priceSet({
          name: product.name,
          unitSellPrice: product.unitSellPrice,
          currency,
        }),
      };
    }

    default:
      return { text: voice.unknownIntent() };
  }
}

module.exports = { executeAction };
