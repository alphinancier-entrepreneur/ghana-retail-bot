const voice = require("../copy/shop-voice");
const { archiveRetailerAccount } = require("../services/retailer");
const { setSessionMode } = require("../services/session");
const { maskPhone } = require("../utils/logSafe");

const DELETE_ACCOUNT_RE =
  /^(delete\s+(my\s+)?(account|data|profile|shop)|remove\s+(my\s+)?(account|data)|close\s+(my\s+)?account|erase\s+(my\s+)?data)\s*[!.?]*$/i;

const DELETE_CONFIRM_RE = /^delete\s*[!.]*$/i;
const DELETE_CANCEL_RE = /^(cancel|no|never\s*mind|nevermind|stop|keep)\s*[!.?]*$/i;

function isDeleteAccountIntent(text) {
  return DELETE_ACCOUNT_RE.test((text || "").trim());
}

function isDeleteConfirm(text) {
  return DELETE_CONFIRM_RE.test((text || "").trim());
}

function isDeleteCancel(text) {
  return DELETE_CANCEL_RE.test((text || "").trim());
}

async function beginAccountDeletion(retailerId) {
  await setSessionMode(retailerId, "awaiting_account_delete_confirm");
  return { text: voice.deleteAccountConfirm(), templateOnly: true };
}

async function finishAccountDeletion(retailerId, phone) {
  await archiveRetailerAccount(retailerId, phone);
  console.log(`account archived: ${maskPhone(phone)}`);
  return { text: voice.deleteAccountDone(), templateOnly: true };
}

async function cancelAccountDeletion(retailerId) {
  await setSessionMode(retailerId, "idle");
  return { text: voice.deleteAccountCancelled(), templateOnly: true };
}

async function abandonAccountDeletion(retailerId) {
  await setSessionMode(retailerId, "idle");
}

module.exports = {
  isDeleteAccountIntent,
  isDeleteConfirm,
  isDeleteCancel,
  beginAccountDeletion,
  finishAccountDeletion,
  cancelAccountDeletion,
  abandonAccountDeletion,
  DELETE_ACCOUNT_RE,
  DELETE_CONFIRM_RE,
};
