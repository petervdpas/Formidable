// controls/miniExprParser.js

const { Parser } = require("expr-eval");
const vm = require("vm");
const { log, warn, error } = require("./nodeLogger");

function parseMiniExpr(expr, context = {}) {
  if (!expr || typeof expr !== "string") return {};

  const match = expr.match(/^\[(.+)\]$/);
  if (!match) return { text: expr };

  const inner = match[1].trim();
  const [rawTextExpr, rawStyleExpr] = inner.split("|").map((s) => s.trim());

  const parser = new Parser();

  // Attempt to evaluate text expression
  let text = safeEval(parser, rawTextExpr, context);
  if (!text) text = safeVmEval(rawTextExpr, context);

  if (!text) {
    const msg = `[miniExprParser] Failed to parse text expression: ${rawTextExpr}`;
    error(msg);
    throw new Error(msg);
  }

  // Attempt to evaluate style expression if present
  let style;
  if (rawStyleExpr !== undefined) {
    style = safeEval(parser, rawStyleExpr, context);
    if (!style) style = safeVmEval(rawStyleExpr, context);
  }

  // Normalize output
  if (style && typeof style === "object" && !Array.isArray(style)) {
    return { text, ...style };
  } else if (typeof style === "string") {
    return { text, color: style };
  } else {
    return { text };
  }
}

function safeEval(parser, expr, context) {
  try {
    const compiled = parser.parse(expr);
    return compiled.evaluate(context);
  } catch (err) {
    if (!/^\{.*\}$/.test(expr)) {
      warn("[miniExprParser] ExprEval error:", expr, err.message);
    }
    return "";
  }
}

function safeVmEval(expr, context) {
  try {
    const wrapped = /^\{.*\}$/.test(expr) ? `(${expr})` : expr;
    return vm.runInNewContext(wrapped, context);
  } catch (err) {
    warn("[miniExprParser] VM Eval error:", expr, err.message);
    return "";
  }
}

module.exports = {
  parseMiniExpr,
};
