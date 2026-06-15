const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { maskPhone } = require("../src/utils/logSafe");

describe("logSafe", () => {
  it("maskPhone hides most of the number", () => {
    const masked = maskPhone("whatsapp:+233533766171");
    assert.equal(masked.includes("+233"), true);
    assert.equal(masked.includes("171"), true);
    assert.equal(masked.includes("+233533766171"), false);
  });
});
