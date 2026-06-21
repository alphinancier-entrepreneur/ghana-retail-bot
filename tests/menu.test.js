const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isGreeting,
  isThanks,
  resolveMenuPayload,
} = require("../src/handlers/menu");

describe("menu", () => {
  it("isGreeting matches hi and help", () => {
    assert.equal(isGreeting("hi"), true);
    assert.equal(isGreeting("Help"), true);
    assert.equal(isGreeting("sold 3 milo"), false);
  });

  it("isThanks matches gratitude, not commands", () => {
    assert.equal(isThanks("thanks"), true);
    assert.equal(isThanks("Thank you!"), true);
    assert.equal(isThanks("medaase"), true);
    assert.equal(isThanks("sold 3 milo"), false);
    assert.equal(isThanks("hi"), false);
  });

  it("resolveMenuPayload maps stock shortcuts", () => {
    assert.equal(resolveMenuPayload("check stock"), "menu_stock");
    assert.equal(resolveMenuPayload("stock"), "menu_stock");
  });

  it("resolveMenuPayload maps new shortcuts", () => {
    assert.equal(resolveMenuPayload("set price"), "menu_price");
    assert.equal(resolveMenuPayload("low stock"), "menu_alert");
    assert.equal(resolveMenuPayload("log expense"), "menu_log_expense");
    assert.equal(resolveMenuPayload("bulk add"), "menu_bulk_add");
  });

  it("resolveMenuPayload returns null for unknown", () => {
    assert.equal(resolveMenuPayload("sold 3 milo"), null);
  });
});
