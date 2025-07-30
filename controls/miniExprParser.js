// controls/miniExprParser.js

const { Parser } = require("expr-eval");
const vm = require("vm");
const { log, warn, error } = require("./nodeLogger");

function parseMiniExpr(expr, originalContext = {}) {
  if (!expr || typeof expr !== "string") return {};

  const match = expr.match(/^\[(.+)\]$/);
  if (!match) return { text: expr };

  const inner = match[1].trim();
  const [rawTextExpr, rawStyleExpr] = splitAtTopLevelPipe(inner);

  const parser = new Parser();

  const context = {
    ...originalContext,
    F: originalContext,
    meta: originalContext,
  };``

  let text = safeEval(parser, rawTextExpr, context);
  if (!text) text = safeVmEval(rawTextExpr, context);

  if (text === undefined) {
    const msg = `[miniExprParser] Failed to parse text expression: ${rawTextExpr}`;
    error(msg);
    throw new Error(msg);
  }

  let style;
  if (rawStyleExpr !== undefined) {
    style = safeEval(parser, rawStyleExpr, context);
    if (!style) style = safeVmEval(rawStyleExpr, context);
  }

  if (style && typeof style === "object" && !Array.isArray(style)) {
    return { text, ...style };
  } else if (typeof style === "string") {
    return { text, color: style };
  } else {
    return { text };
  }
}

// Improved pipe splitter — respects nesting
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
