// controls/miniExprParser.js

const { Parser } = require("expr-eval");
const vm = require("vm");
const { log, warn, error } = require("./nodeLogger");
const helpers = require("./expressionHelpers");

function parseMiniExpr(expr, originalContext = {}) {
  if (!expr || typeof expr !== "string") return { text: "" };

  const match = expr.match(/^\[(.*)\]$/s);
  if (!match) return { text: expr };

  const inner = match[1].trim();
  const [rawTextExpr, rawStyleExpr] = splitAtTopLevelPipe(inner);

  const parser = new Parser();

  const context = {
    ...originalContext,
    F: originalContext,
    meta: originalContext,
    ...helpers,
  };

  // ─── Debug ────────────────────────────────────────────────
  /*
  try {
    log("[miniExprParser] Parsing:", expr);
    log("[miniExprParser] rawTextExpr:", rawTextExpr);
    log("[miniExprParser] F keys:", Object.keys(context.F || {}));
    log("[miniExprParser] today():", context.today());
    log("[miniExprParser] datum evaluatie:", context.F?.["audit-control-datum-evaluatie"]);
  } catch (e) {
    warn("[miniExprParser] Debug logging failed:", e.message);
  }
  */

  // ─── Evaluate text ────────────────────────────────────────
  let rawResult;

  const needsVm = /[?:{}]/.test(rawTextExpr); // detect ternary or object syntax
  if (needsVm) {
    // Don't even attempt safeEval if we already know it will fail
    rawResult = safeVmEval(rawTextExpr, context, true); // ← pass suppressWarning here!
  } else {
    rawResult = safeEval(parser, rawTextExpr, context); // fallback will suppress internally
    if (!rawResult) rawResult = safeVmEval(rawTextExpr, context, true);
  }

  if (rawResult === undefined) {
    const msg = `[miniExprParser] Failed to evaluate expression: ${rawTextExpr}`;
    error(msg);
    return { text: "[Invalid expression]" };
  }

  // ─── Normalize result ─────────────────────────────────────
  let normalized = {};

  if (
    typeof rawResult === "object" &&
    rawResult !== null &&
    "text" in rawResult
  ) {
    normalized = { ...rawResult };
  } else {
    normalized = { text: String(rawResult) };
  }

  // ─── Evaluate style expression ────────────────────────────
  if (rawStyleExpr !== undefined) {
    const styleNeedsVm = /[?:{}]/.test(rawStyleExpr);
    let style;

    if (styleNeedsVm) {
      style = safeVmEval(rawStyleExpr, context, true);
    } else {
      style = safeEval(parser, rawStyleExpr, context, true);
      if (!style) style = safeVmEval(rawStyleExpr, context, true);
    }

    if (style && typeof style === "object" && !Array.isArray(style)) {
      Object.assign(normalized, style);
    } else if (typeof style === "string") {
      normalized.color = style;
    }
  }

  return normalized;
}

// ─────────────────────────────────────────────────────────────

function splitAtTopLevelPipe(str) {
  let level = 0;
  let inQuote = false;
  let quoteChar = null;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if ((c === '"' || c === "'") && str[i - 1] !== "\\") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = c;
      } else if (c === quoteChar) {
        inQuote = false;
      }
    }

    if (!inQuote) {
      if (c === "{" || c === "[" || c === "(") level++;
      if (c === "}" || c === "]" || c === ")") level--;
      if (c === "|" && level === 0) {
        return [str.slice(0, i).trim(), str.slice(i + 1).trim()];
      }
    }
  }

  return [str.trim()]; // No pipe found
}

function safeEval(parser, expr, context, suppressWarning = false) {
  try {
    const compiled = parser.parse(expr);
    return compiled.evaluate(context);
  } catch (err) {
    if (!suppressWarning && !/^\{.*\}$/.test(expr)) {
      warn("[miniExprParser] ExprEval error:", expr, err.message);
    }
    return "";
  }
}

function safeVmEval(expr, context, suppressWarning = false) {
  try {
    const wrapped = /^\{.*\}$/.test(expr) ? `(${expr})` : expr;
    return vm.runInNewContext(wrapped, context);
  } catch (err) {
    if (!suppressWarning) {
      warn("[miniExprParser] VM Eval error:", expr, err.message);
    }
    return "";
  }
}

module.exports = {
  parseMiniExpr,
};
