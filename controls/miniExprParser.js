// controls/miniExprParser.js

const { Parser } = require("expr-eval");
const vm = require("vm");
const { log, warn, error } = require("./nodeLogger");

function parseMiniExpr(expr, context = {}) {
  if (!expr || typeof expr !== "string") return {};

  try {
    const match = expr.match(/^\[(.+)\]$/);
    if (!match) return { text: expr };

    const inner = match[1].trim();
    const [rawTextExpr, rawStyleExpr] = inner.split("|").map((s) => s.trim());

    const parser = new Parser();

    const text =
      safeEval(parser, rawTextExpr, context) ||
      safeVmEval(rawTextExpr, context) ||
      "";

    let style =
      rawStyleExpr !== undefined
        ? safeEval(parser, rawStyleExpr, context) ||
          safeVmEval(rawStyleExpr, context) ||
          undefined
        : undefined;

    // Normalize output
    if (style && typeof style === "object" && !Array.isArray(style)) {
      return { text, ...style };
    } else if (typeof style === "string") {
      return { text, color: style };
    } else {
      return { text };
    }

  } catch (err) {
    error("[miniExprParser] Parse error:", err);
    return { text: expr };
  }
}

function safeEval(parser, expr, context) {
  try {
    const compiled = parser.parse(expr);
    return compiled.evaluate(context);
  } catch (err) {
    // Suppress warning if input is an object literal
    if (!/^\{.*\}$/.test(expr)) {
      warn("[miniExprParser] ExprEval error:", expr);
    }
    return "";
  }
}

function safeVmEval(expr, context) {
  try {
    // Wrap in parentheses for object literal:
    const wrapped = /^\{.*\}$/.test(expr) ? `(${expr})` : expr;
    return vm.runInNewContext(wrapped, context);
  } catch (err) {
    warn("[miniExprParser] VM Eval error:", expr, err);
    return "";
  }
}

module.exports = {
  parseMiniExpr,
};
