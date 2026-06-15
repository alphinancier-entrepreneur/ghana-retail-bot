const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getGhanaTodayDateString,
  getGhanaTodayStartIso,
} = require("../src/utils/ghanaDate");

describe("ghanaDate", () => {
  it("getGhanaTodayDateString returns YYYY-MM-DD", () => {
    const today = getGhanaTodayDateString();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("getGhanaTodayStartIso starts at midnight UTC for Ghana day", () => {
    const today = getGhanaTodayDateString();
    assert.equal(getGhanaTodayStartIso(), `${today}T00:00:00.000Z`);
  });
});
