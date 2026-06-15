const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

describe("usage config", () => {
  const originalUnlimited = process.env.UNLIMITED_USERS;
  const originalLimit = process.env.DAILY_FREE_LIMIT;
  const originalDisabled = process.env.DISABLE_USAGE_LIMITS;

  before(() => {
    process.env.UNLIMITED_USERS = "+233201234567,+233501234567";
    process.env.DAILY_FREE_LIMIT = "20";
    delete process.env.DISABLE_USAGE_LIMITS;
    delete require.cache[require.resolve("../src/config/usage")];
  });

  after(() => {
    if (originalUnlimited === undefined) {
      delete process.env.UNLIMITED_USERS;
    } else {
      process.env.UNLIMITED_USERS = originalUnlimited;
    }
    if (originalLimit === undefined) {
      delete process.env.DAILY_FREE_LIMIT;
    } else {
      process.env.DAILY_FREE_LIMIT = originalLimit;
    }
    if (originalDisabled === undefined) {
      delete process.env.DISABLE_USAGE_LIMITS;
    } else {
      process.env.DISABLE_USAGE_LIMITS = originalDisabled;
    }
    delete require.cache[require.resolve("../src/config/usage")];
  });

  it("isUnlimitedUser matches configured phones", () => {
    const { isUnlimitedUser } = require("../src/config/usage");
    assert.equal(isUnlimitedUser("whatsapp:+233201234567"), true);
    assert.equal(isUnlimitedUser("+233501234567"), true);
    assert.equal(isUnlimitedUser("+233999999999"), false);
  });

  it("getWarningThreshold is 90% of daily limit", () => {
    const { getWarningThreshold, DAILY_FREE_LIMIT } = require("../src/config/usage");
    assert.equal(DAILY_FREE_LIMIT, 20);
    assert.equal(getWarningThreshold(), 18);
  });

  it("isUsageLimitsDisabled is true when DISABLE_USAGE_LIMITS=true", () => {
    process.env.DISABLE_USAGE_LIMITS = "true";
    delete require.cache[require.resolve("../src/config/usage")];
    const { isUsageLimitsDisabled } = require("../src/config/usage");
    assert.equal(isUsageLimitsDisabled(), true);
  });
});
