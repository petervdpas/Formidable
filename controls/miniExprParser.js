// controls/miniExprParser.js

const { Parser } = require("expr-eval");

function parseMiniExpr(expr, context = {}) {
  if (!expr || typeof expr !== "string") return { label: "", color: "" };

  try {
    // Simple syntax:
    //  [field] → returns field as label
    //  [field + " (" + otherField + ")"]
    //  [check ? "green" : "red"]

    // Match bracketed expression:
    const match = expr.match(/^\[(.+)\]$/);
    if (!match) {
      return { label: expr, color: "" };
    }

    const inner = match[1].trim();

    // Split expression: "labelExpr | colorExpr"
    const [labelPart, colorPart] = inner.split("|").map((s) => s.trim());

    const parser = new Parser();

    const labelExpr = parser.parse(labelPart);
    const label = labelExpr.evaluate(context);

    let color = "";
    if (colorPart) {
      const colorExpr = parser.parse(colorPart);
      color = colorExpr.evaluate(context);
    }

    return {
      label: label ?? "",
      color: color ?? "",
    };
  } catch (err) {
    console.warn("[miniExprParser] Parse error:", err);
    return { label: expr, color: "" };
  }
}

const helpers = {
  parseMiniExpr,
};

module.exports = {
  parseMiniExpr,
  helpers,
};
