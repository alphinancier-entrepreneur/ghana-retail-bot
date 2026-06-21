const { generateProse } = require("./claude");

/**
 * Writer is on when an Anthropic key exists and it hasn't been explicitly
 * disabled. No key (tests/local) → off, so we fall back to templates.
 */
function isWriterEnabled() {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || "").trim();
  const disabled = /^(false|0|no|off)$/i.test(
    process.env.MARIAM_WRITER_ENABLED || ""
  );
  return hasKey && !disabled;
}

/**
 * Turn a handler result into the final message text.
 * result = { text, event? } where event = { kind, facts, mode, body? }.
 * Always resolves to a string; falls back to result.text on any problem.
 */
async function composeReply(result) {
  const text = result?.text || "";
  const event = result?.event;

  if (!event || !isWriterEnabled()) {
    return text;
  }

  const mode = event.mode === "wrap" ? "wrap" : "full";

  try {
    if (mode === "wrap") {
      const payload = JSON.stringify({
        kind: event.kind,
        mode: "line",
        facts: event.facts || {},
      });
      const line = await generateProse(payload, { maxTokens: 80 });
      const body = event.body != null ? event.body : text;
      const composed = `${body}\n\n${line}`.trim();
      logWriter("ok", event.kind, composed.length);
      return composed;
    }

    const payload = JSON.stringify({
      kind: event.kind,
      facts: event.facts || {},
    });
    const prose = await generateProse(payload, { maxTokens: 200 });
    logWriter("ok", event.kind, prose.length);
    return prose;
  } catch (err) {
    logWriter("fallback", event.kind, 0, err.message);
    return text;
  }
}

function logWriter(status, kind, chars, reason) {
  if (status === "ok") {
    console.log("writer ok", { kind, chars });
  } else {
    console.log("writer fallback", { kind, reason: reason || "unknown" });
  }
}

module.exports = { composeReply, isWriterEnabled };
