const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const voice = require("../src/copy/shop-voice");
const { composeReply } = require("../src/services/voiceWriter");

describe("onboarding", () => {
  const original = process.env.MARIAM_WRITER_ENABLED;

  before(() => {
    process.env.MARIAM_WRITER_ENABLED = "false";
  });

  after(() => {
    if (original === undefined) {
      delete process.env.MARIAM_WRITER_ENABLED;
    } else {
      process.env.MARIAM_WRITER_ENABLED = original;
    }
  });

  it("onboardingExampleLines returns four example phrases", () => {
    const examples = voice.onboardingExampleLines();
    assert.equal(examples.length, 4);
    assert.equal(examples.includes("add 20 tins of milo"), true);
    assert.equal(examples.includes("sold 3 milo"), true);
    assert.equal(examples.includes("what's in stock?"), true);
    assert.equal(examples.includes("I spent 50 cedis on transport"), true);
  });

  it("shopNameSaved includes shop name and all example phrases", () => {
    const text = voice.shopNameSaved({ shopName: "Kofi's Shop" });
    assert.match(text, /Kofi's Shop/);
    assert.match(text, /add 20 tins of milo/);
    assert.match(text, /sold 3 milo/);
    assert.match(text, /what's in stock\?/);
    assert.match(text, /I spent 50 cedis on transport/);
    assert.match(text, /stock, sales, and spending/);
  });

  it("composeReply returns full shopNameSaved template when writer disabled", async () => {
    const template = voice.shopNameSaved({ shopName: "Mama Ama" });
    const result = {
      text: template,
      event: {
        kind: "shop_name_saved",
        mode: "full",
        facts: {
          shopName: "Mama Ama",
          examples: voice.onboardingExampleLines(),
        },
      },
    };
    assert.equal(await composeReply(result), template);
    assert.match(template, /Mama Ama/);
    assert.match(template, /sold 3 milo/);
  });
});
