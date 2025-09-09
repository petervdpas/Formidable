// modules/handlers/codeExecHandler.js
import { EventBus } from "../eventBus.js";

/* ---------- utils ---------- */

function toSerializable(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  )
    return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  const t = typeof value;
  if (t === "function" || t === "symbol" || t === "undefined") return undefined;

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = value
      .map((v) => toSerializable(v, seen))
      .filter((v) => v !== undefined);
    seen.delete(value);
    return out;
  }
  if (value instanceof Map) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = Array.from(value.entries()).map(([k, v]) => [
      toSerializable(k, seen),
      toSerializable(v, seen),
    ]);
    seen.delete(value);
    return out;
  }
  if (value instanceof Set) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = Array.from(value.values()).map((v) => toSerializable(v, seen));
    seen.delete(value);
    return out;
  }
  if (t === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = {};
    for (const k of Object.keys(value)) {
      const sv = toSerializable(value[k], seen);
      if (sv !== undefined) out[k] = sv;
    }
    seen.delete(value);
    return out;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

const RESERVED = new Set([
  "input",
  "api",
  "arguments",
  "await",
  "yield",
  "console",
  "window",
  "globalThis",
  "eval",
  "Function",
  "URL",
  "Blob",
  "__orig__",
  "logs",
  "timer",
]);

function toSafeIdent(name) {
  const id = String(name)
    .trim()
    .replace(/[^\w$]/g, "_");
  if (!/^[A-Za-z_$][\w$]*$/.test(id)) return null;
  if (RESERVED.has(id)) return null;
  return id;
}

function smartParse(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function normalizeOpts(opts) {
  const out = {};
  if (!opts || typeof opts !== "object") return out;
  for (const [k, v] of Object.entries(opts)) {
    out[k] = typeof v === "string" ? smartParse(v) : v;
  }
  return out;
}

function buildPreludeFromOpts(opts) {
  if (!opts || typeof opts !== "object") return "";
  const lines = [];
  for (const k of Object.keys(opts)) {
    const id = toSafeIdent(k);
    if (!id) continue;
    // pull from input.opts so we keep one source of truth
    lines.push(`const ${id} = (input?.opts?.[${JSON.stringify(k)}]);`);
  }
  return lines.join("\n");
}

function fmtLogArg(x) {
  try {
    return typeof x === "string" ? x : JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function pickKeys(obj, keys) {
  if (!obj || !Array.isArray(keys) || !keys.length) return obj;
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object" || seen.has(obj)) return obj;
  seen.add(obj);
  for (const v of Object.getOwnPropertyNames(obj).map((k) => obj[k]))
    deepFreeze(v, seen);
  for (const v of Object.getOwnPropertySymbols(obj).map((k) => obj[k]))
    deepFreeze(v, seen);
  return Object.freeze(obj);
}

/* ---------- compile then run ---------- */

async function compileForValidation(code, prelude = "") {
  const src = `export default async function(input, api){\n${prelude}\n${code}\n}`;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try {
    const mod = await import(/* @vite-ignore */ url);
    return { ok: true, mod, url };
  } catch (err) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    return { ok: false, error: String(err) };
  }
}

async function executeValidatedModule({ mod, url, input, api, timeout }) {
  const __orig__ = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };
  const logs = [];
  const LOG_LIMIT = 200;

  const proxy = (...a) => {
    if (logs.length >= LOG_LIMIT) return;
    try {
      logs.push(a.map(fmtLogArg).join(" "));
    } catch {
      logs.push(a.map(String).join(" "));
    }
  };
  console.log = proxy;
  console.warn = proxy;
  console.error = proxy;
  console.info = proxy;

  let timer = null;
  try {
    const runP = Promise.resolve(mod.default(input, api));
    const toP = new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error("Timeout")), timeout);
    });
    const result = await Promise.race([runP, toP]);
    return { ok: true, result, logs };
  } catch (err) {
    return { ok: false, error: String(err), logs };
  } finally {
    if (timer) clearTimeout(timer);
    console.log = __orig__.log;
    console.warn = __orig__.warn;
    console.error = __orig__.error;
    console.info = __orig__.info;
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}

/* ---------- public handler ---------- */

/**
 * handleCodeExecute({
 *   code: string,
 *   input?: any,
 *   timeout?: number,
 *   inputMode?: 'safe'|'raw' = 'safe',
 *   apiPick?: string[],              // top-level CFA keys
 *   apiMode?: 'frozen'|'raw' = 'frozen',
 *   opts?: Record<string,any>,       // template options
 *   optsAsVars?: boolean = false     // expose opts as const locals
 * })
 */
export async function handleCodeExecute({
  code = "",
  input = {},
  timeout = 2500,
  inputMode = "safe",
  apiPick = null,
  apiMode = "frozen",
  opts = null,
  optsAsVars = false,
} = {}) {
  try {
    if (typeof code !== "string" || code.trim() === "") {
      return { ok: false, error: "No code provided", logs: [] };
    }

    const preparedInput = inputMode === "raw" ? input : toSerializable(input);

    // CFA → pick → (optionally) freeze
    let preparedApi = window.CFA || {};
    if (Array.isArray(apiPick) && apiPick.length) {
      preparedApi = pickKeys(preparedApi, apiPick);
    }
    if (apiMode === "frozen") {
      try {
        preparedApi = deepFreeze(preparedApi);
      } catch {}
    }

    // normalize options once
    const normalizedOpts = normalizeOpts(opts);

    // prelude gives: const myVar = input?.opts?.["myVar"];
    const prelude = optsAsVars ? buildPreludeFromOpts(normalizedOpts) : "";

    // compile with prelude
    const compiled = await compileForValidation(code, prelude);
    if (!compiled.ok) {
      return { ok: false, error: compiled.error || "Invalid code", logs: [] };
    }

    // ensure input.opts exists and matches the locals’ values
    const finalInput = {
      ...preparedInput,
      opts: { ...(preparedInput?.opts || {}), ...normalizedOpts },
    };

    return await executeValidatedModule({
      mod: compiled.mod,
      url: compiled.url,
      input: finalInput,
      api: preparedApi,
      timeout: Math.max(1, Number(timeout) || 1),
    });
  } catch (err) {
    EventBus.emit("logging:error", ["[CodeExec] Execution failed:", err]);
    return { ok: false, error: String(err), logs: [] };
  }
}
