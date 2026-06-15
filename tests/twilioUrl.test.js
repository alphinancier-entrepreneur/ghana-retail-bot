const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizePublicBaseUrl } = require("../src/services/twilio");

describe("twilio URL helpers", () => {
  it("normalizePublicBaseUrl strips trailing slash and webhook path", () => {
    assert.equal(
      normalizePublicBaseUrl("https://example.com/"),
      "https://example.com"
    );
    assert.equal(
      normalizePublicBaseUrl("https://example.com/webhook/whatsapp"),
      "https://example.com"
    );
  });

  it("normalizePublicBaseUrl returns empty for missing url", () => {
    assert.equal(normalizePublicBaseUrl(""), "");
    assert.equal(normalizePublicBaseUrl(null), "");
  });
});
