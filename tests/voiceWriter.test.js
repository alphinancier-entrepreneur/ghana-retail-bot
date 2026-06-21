const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { composeReply, isWriterEnabled } = require("../src/services/voiceWriter");
const { ALLOWED_ACTIONS } = require("../src/services/claude");

describe("voiceWriter", () => {
  const original = process.env.MARIAM_WRITER_ENABLED;

  before(() => {
    // Force the writer off so composeReply never hits the network in CI.
    process.env.MARIAM_WRITER_ENABLED = "false";
  });

  after(() => {
    if (original === undefined) {
      delete process.env.MARIAM_WRITER_ENABLED;
    } else {
      process.env.MARIAM_WRITER_ENABLED = original;
    }
  });

  it("is disabled when MARIAM_WRITER_ENABLED=false", () => {
    assert.equal(isWriterEnabled(), false);
  });

  it("returns template text when disabled (full mode)", async () => {
    const result = {
      text: "Milo sold ✅ 4 left.",
      event: { kind: "sale_recorded", mode: "full", facts: { item: "milo" } },
    };
    assert.equal(await composeReply(result), "Milo sold ✅ 4 left.");
  });

  it("returns full template text when disabled (wrap mode keeps body+closing)", async () => {
    const result = {
      text: "📦 Here's your stock:\n• Milo — 4 tin\n\nLooking good.",
      event: {
        kind: "stock_list",
        mode: "wrap",
        body: "📦 Here's your stock:\n• Milo — 4 tin",
        facts: { itemCount: 1 },
      },
    };
    assert.equal(
      await composeReply(result),
      "📦 Here's your stock:\n• Milo — 4 tin\n\nLooking good."
    );
  });

  it("returns text when there is no event", async () => {
    assert.equal(await composeReply({ text: "Just a hint." }), "Just a hint.");
  });
});

describe("claude actions", () => {
  it("out_of_scope is an allowed action", () => {
    assert.equal(ALLOWED_ACTIONS.has("out_of_scope"), true);
  });

  it("keeps unknown as a distinct allowed action", () => {
    assert.equal(ALLOWED_ACTIONS.has("unknown"), true);
  });
});
