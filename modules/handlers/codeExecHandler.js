// modules/handlers/codeExecHandler.js
import { EventBus } from "../eventBus.js";

/* ---------- utils ---------- */

function toSerializable(value, seen = new WeakSet()) {
  if (value === null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  const t = typeof value;
  if (t === "function" || t === "symbol" || t === "undefined") return undefined;

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = value.map(v => toSerializable(v, seen)).filter(v => v !== undefined);
    seen.delete(value);
    return out;
  }
  if (value instanceof Map) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = Array.from(value.entries()).map(([k, v]) => [toSerializable(k, seen), toSerializable(v, seen)]);
    seen.delete(value);
    return out;
  }
  if (value instanceof Set) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out = Array.from(value.values()).map(v => toSerializable(v, seen));
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
  try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
}

function fmtLogArg(x) { try { return typeof x === "string" ? x : JSON.stringify(x); } catch { return String(x); } }

function pickKeys(obj, keys) {
  if (!obj || !Array.isArray(keys) || !keys.length) return obj;
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object" || seen.has(obj)) return obj;
  seen.add(obj);
  for (const v of Object.getOwnPropertyNames(obj).map(k => obj[k])) deepFreeze(v, seen);
  for (const v of Object.getOwnPropertySymbols(obj).map(k => obj[k])) deepFreeze(v, seen);
  return Object.freeze(obj);
}

/* ---------- compile then run ---------- */

async function compileForValidation(code) {
  const src = `export default async function(input, api){\n${code}\n}`;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try {
    const mod = await import(/* @vite-ignore */ url);
    return { ok: true, mod, url };
  } catch (err) {
    try { URL.revokeObjectURL(url); } catch {}
    return { ok: false, error: String(err) };
  }
}

async function executeValidatedModule({ mod, url, input, api, timeout }) {
  const __orig__ = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  const logs = [];
  const proxy = (...a) => { try { logs.push(a.map(fmtLogArg).join(" ")); } catch { logs.push(a.map(String).join(" ")); } };
  console.log = proxy; console.warn = proxy; console.error = proxy; console.info = proxy;

  let timer = null;
  try {
    const runP = Promise.resolve(mod.default(input, api));
    const toP = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("Timeout")), timeout); });
    const result = await Promise.race([runP, toP]);
    return { ok: true, result, logs };
  } catch (err) {
    return { ok: false, error: String(err), logs };
  } finally {
    if (timer) clearTimeout(timer);
    console.log = __orig__.log; console.warn = __orig__.warn; console.error = __orig__.error; console.info = __orig__.info;
    try { URL.revokeObjectURL(url); } catch {}
  }
}

/* ---------- public handler ---------- */

/**
 * handleCodeExecute({
 *   code: string,
 *   input?: any,
 *   timeout?: number,
 *   inputMode?: 'safe' | 'raw',        // default 'safe'
 *   apiPick?: string[],                // whitelist top-level CFA keys
 *   apiMode?: 'frozen' | 'raw',        // default 'frozen'
 * })
 */
export async function handleCodeExecute({
  code = "",
  input = {},
  timeout = 2500,
  inputMode = "safe",
  apiPick = null,
  apiMode = "frozen",
} = {}) {
  try {
    if (typeof code !== "string" || code.trim() === "") {
      return { ok: false, error: "No code provided", logs: [] };
    }

    // 1) compile-only validation
    const compiled = await compileForValidation(code);
    if (!compiled.ok) {
      return { ok: false, error: compiled.error || "Invalid code", logs: [] };
    }

    // 2) prepare input
    const preparedInput = inputMode === "raw" ? input : toSerializable(input);

    // 3) prepare API → always start from CFA
    let preparedApi = window.CFA || {};
    if (Array.isArray(apiPick) && apiPick.length) {
      preparedApi = pickKeys(preparedApi, apiPick);
    }
    if (apiMode === "frozen") {
      try { preparedApi = deepFreeze(preparedApi); } catch {}
    }

    // 4) execute
    return await executeValidatedModule({
      mod: compiled.mod,
      url: compiled.url,
      input: preparedInput,
      api: preparedApi,
      timeout: Math.max(1, Number(timeout) || 1),
    });
  } catch (err) {
    EventBus.emit("logging:error", ["[CodeExec] Execution failed:", err]);
    return { ok: false, error: String(err), logs: [] };
  }
}
