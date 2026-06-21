const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isDeleteAccountIntent,
  isDeleteConfirm,
  isDeleteCancel,
  abandonAccountDeletion,
} = require("../src/handlers/accountDelete");
const { ALLOWED_ACTIONS } = require("../src/services/claude");

describe("accountDelete", () => {
  it("isDeleteAccountIntent matches common phrases", () => {
    assert.equal(isDeleteAccountIntent("delete my account"), true);
    assert.equal(isDeleteAccountIntent("Delete my data"), true);
    assert.equal(isDeleteAccountIntent("close my account"), true);
    assert.equal(isDeleteAccountIntent("sold 3 milo"), false);
  });

  it("isDeleteConfirm matches DELETE only", () => {
    assert.equal(isDeleteConfirm("DELETE"), true);
    assert.equal(isDeleteConfirm("delete"), true);
    assert.equal(isDeleteConfirm("delete my account"), false);
  });

  it("isDeleteCancel matches cancel phrases", () => {
    assert.equal(isDeleteCancel("cancel"), true);
    assert.equal(isDeleteCancel("no"), true);
    assert.equal(isDeleteCancel("never mind"), true);
    assert.equal(isDeleteCancel("delete"), false);
  });

  it("normal messages are not DELETE confirm or CANCEL", () => {
    assert.equal(isDeleteConfirm("Hi"), false);
    assert.equal(isDeleteConfirm("hi"), false);
    assert.equal(isDeleteConfirm("sold 3 milo"), false);
    assert.equal(isDeleteCancel("Hi"), false);
    assert.equal(isDeleteCancel("sold 3 milo"), false);
    assert.equal(isDeleteCancel("what's in stock?"), false);
  });

  it("abandonAccountDeletion is exported for webhook fall-through", () => {
    assert.equal(typeof abandonAccountDeletion, "function");
  });
});

describe("claude delete_account action", () => {
  it("delete_account is an allowed action", () => {
    assert.equal(ALLOWED_ACTIONS.has("delete_account"), true);
  });
});
