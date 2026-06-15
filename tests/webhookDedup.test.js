const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isDuplicateMessageSidError } = require("../src/services/webhookDedup");

describe("webhookDedup", () => {
  it("isDuplicateMessageSidError detects Postgres unique violation", () => {
    assert.equal(isDuplicateMessageSidError({ code: "23505" }), true);
    assert.equal(isDuplicateMessageSidError({ code: "42P01" }), false);
    assert.equal(isDuplicateMessageSidError(null), false);
  });
});
