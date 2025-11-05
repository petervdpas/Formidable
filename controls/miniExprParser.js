// controls/miniExprParser.js
const { Parser } = require("expr-eval");
const vm = require("vm");
const { log, warn, error } = require("./nodeLogger");
const helpers = require("./expressionHelpers");

// ==== Security switches =====================================================
const MAX_EXPR_LEN = 1024;
const SAFE_CHARS = /^[\s\w\d+\-*/%<>=!&|^?:(),.[\]{}'"]+$/u;

// Ask helpers which functions are safe to expose
const ALLOWED_HELPERS = (helpers.allowedHelperNames?.() || []);

// ---- Primitive whitelist for expr-eval -------------------------------------
function isAllowedPrimitive(v) {
  return (
    typeof v === "number" ||
    typeof v === "boolean" ||
    typeof v === "string" ||
    v === null
  );
}

// Build a null-prototype shallow scope for expr-eval (NO functions!)
function buildExprEvalScope(raw) {
  const scope = Object.create(null);
  if (!raw || typeof raw !== "object") return scope;

  for (const [k, v] of Object.entries(raw)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    if (typeof v === "function") continue;
    if (!isAllowedPrimitive(v)) continue;
    scope[k] = v;
  }
  return scope;
}

// ---- Cloning / freezing ----------------------------------------------------
function deepFreeze(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return obj;
}

function structuredCloneSafe(value) {
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch {}
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

// ---- VM sandbox ------------------------------------------------------------
function buildVmSandbox(originalContext) {
  const base = Object.create(null);

  // Plain data (primitives only) from originalContext
  const data = Object.create(null);
  if (originalContext && typeof originalContext === "object") {
    for (const [k, v] of Object.entries(originalContext)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
      if (typeof v === "function") continue;
      if (isAllowedPrimitive(v)) data[k] = v;
    }
  }

  // Curated helpers from helpers.allowedHelpers()
  const pickedHelpers = Object.create(null);
  const allowedMap =
    (typeof helpers.allowedHelpers === "function" && helpers.allowedHelpers()) ||
    Object.create(null);

  for (const [name, fn] of Object.entries(allowedMap)) {
    if (typeof fn === "function") {
      Object.defineProperty(pickedHelpers, name, {
        value: fn.bind(null),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    } else if (fn && typeof fn === "object") {
      pickedHelpers[name] = deepFreeze(structuredCloneSafe(fn));
    }
  }

  // Freeze F/meta clone
  base.F = Object.freeze(structuredCloneSafe(originalContext ?? null));
  base.meta = base.F;

  // Helpers and data bag
  base.h = Object.freeze(pickedHelpers);
  base.d = Object.freeze(data);

  // ✅ Back-compat: also expose primitives as top-level read-only bindings
  for (const [k, v] of Object.entries(data)) {
    Object.defineProperty(base, k, {
      value: v,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }

  // Safe globals
  base.Math = Math;
  base.JSON = JSON;

  return deepFreeze(base);
}

// ---- Expression sanitization ----------------------------------------------
function sanitizeExpr(expr) {
  if (typeof expr !== "string") return "";
  const trimmed = expr.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_EXPR_LEN) throw new Error("Expression too long");
  if (!SAFE_CHARS.test(trimmed)) throw new Error("Expression contains disallowed characters");
  return trimmed;
}

// =============================================================================

function parseMiniExpr(expr, originalContext = {}) {
  if (!expr || typeof expr !== "string") return { text: "" };

  const match = expr.match(/^\[(.*)\]$/s);
  if (!match) return { text: expr };

  const inner = match[1].trim();
  const [rawTextExpr, rawStyleExpr] = splitAtTopLevelPipe(inner);

  const parser = new Parser();

  // Build safe contexts
  const exprEvalScope = buildExprEvalScope({
    ...originalContext,
    F: null,
    meta: null,
  });

  const vmSandbox = buildVmSandbox({ ...originalContext });

  // ─── Debug ────────────────────────────────────────────────
  /*
  try {
    log("[miniExprParser] Parsing:", expr);
    log("[miniExprParser] rawTextExpr:", rawTextExpr);
    log("[miniExprParser] rawStyleExpr:", rawStyleExpr);
    log("[miniExprParser] F keys:", Object.keys(vmSandbox.F || {}));
    log("[miniExprParser] today() via helpers:", helpers.today?.());
    log("[miniExprParser] datum evaluatie:", vmSandbox.F?.["audit-control-datum-evaluatie"]);
    log("[miniExprParser] allowed helpers:", ALLOWED_HELPERS);
  } catch (e) {
    warn("[miniExprParser] Debug logging failed:", e.message);
  }
  */

  // ─── Evaluate text ────────────────────────────────────────
  let rawResult;
  try {
    const textExpr = sanitizeExpr(rawTextExpr);
    const needsVm = /[?:{}]/.test(textExpr);

    if (needsVm) {
      rawResult = safeVmEval(textExpr, vmSandbox, true);
    } else {
      rawResult = safeEval(parser, textExpr, exprEvalScope);
      if (rawResult === "" || typeof rawResult === "undefined") {
        rawResult = safeVmEval(textExpr, vmSandbox, true);
      }
    }
  } catch (e) {
    error(`[miniExprParser] Failed to evaluate expression: ${rawTextExpr} (${e.message})`);
    return { text: "[Invalid expression]" };
  }

  // ─── Normalize result ─────────────────────────────────────
  let normalized = {};
  if (Array.isArray(rawResult)) {
    normalized = { text: rawResult.join(", "), items: rawResult };
  } else if (typeof rawResult === "object" && rawResult !== null && "text" in rawResult) {
    normalized = { ...rawResult };
  } else {
    normalized = { text: String(rawResult) };
  }

  // ─── Evaluate style expression ────────────────────────────
  if (rawStyleExpr !== undefined) {
    try {
      const styleExpr = sanitizeExpr(rawStyleExpr);
      const styleNeedsVm = /[?:{}]/.test(styleExpr);
      let style;

      if (styleNeedsVm) {
        style = safeVmEval(styleExpr, vmSandbox, true);
      } else {
        style = safeEval(parser, styleExpr, exprEvalScope, true);
        if (style === "" || typeof style === "undefined") {
          style = safeVmEval(styleExpr, vmSandbox, true);
        }
      }

      if (Array.isArray(style)) {
        normalized.classes = style.map(String);
      } else if (style && typeof style === "object") {
        Object.assign(normalized, style);
      } else if (typeof style === "string") {
        normalized.color = style;
      }
    } catch (e) {
      warn("[miniExprParser] Style expr ignored:", e.message);
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
  return [str.trim()];
}

// expr-eval path
function safeEval(parser, expr, scope, suppressWarning = false) {
  try {
    const compiled = parser.parse(expr);
    return compiled.evaluate(scope);
  } catch (err) {
    if (!suppressWarning && !/^\{.*\}$/.test(expr)) {
      warn("[miniExprParser] ExprEval error:", expr, err.message);
    }
    return "";
  }
}

// vm path
function safeVmEval(expr, sandbox, suppressWarning = false) {
  try {
    const wrapped = /^\{.*\}$/.test(expr) ? `(${expr})` : expr;
    const script = new vm.Script(`"use strict";(${wrapped})`, {
      filename: "mini-expr.vm.js",
      displayErrors: true,
    });

    return script.runInNewContext(sandbox, {
      timeout: 50,
      breakOnSigint: true,
      microtaskMode: "afterEvaluate",
    });
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
