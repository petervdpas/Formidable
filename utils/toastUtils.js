// utils/toastUtils.js
import { EventBus } from "../modules/eventBus.js";

/**
 * Minimal toast facade:
 *   Toast.success("toast.key", [arg1, arg2])
 *   Toast.info("Plain text message")
 *   Toast.show("warning", "toast.key", [args], { dedupeMs: 800, force: false, duration: 3000, sticky: false, id: "opt" })
 *
 * - If the first param looks like an i18n key (contains a dot, no whitespace), we send { languageKey, args }
 * - Otherwise we send { message }
 * - Args are passed through unchanged to your i18n layer
 * - Variants normalized (warn → warning)
 * - Simple dedupe window to avoid spam
 */

const lastShown = new Map(); // hash -> timestamp

function isI18nKey(s) {
  return typeof s === "string" && s.includes(".") && !/\s/.test(s);
}

function normalizeVariant(v) {
  const x = String(v || "").toLowerCase();
  if (x === "warn") return "warning";
  return x || "info";
}

function buildPayload(variant, keyOrText, args = [], opts = {}) {
  const v = normalizeVariant(variant);
  const base = isI18nKey(keyOrText)
    ? { languageKey: keyOrText, ...(args?.length ? { args } : {}) }
    : { message: String(keyOrText ?? "") };

  // Optional extras your toast component may honor
  if (Number.isFinite(opts.duration)) base.duration = opts.duration;
  if (typeof opts.sticky === "boolean") base.sticky = opts.sticky;
  if (opts.id) base.id = String(opts.id);

  return { variant: v, ...base };
}

function hashPayload(p) {
  return [
    p.variant,
    p.languageKey || "",
    p.message || "",
    JSON.stringify(p.args || []),
    p.id || "",
  ].join("|");
}

function emit(payload) {
  EventBus.emit("ui:toast", payload);
}

function show(variant, keyOrText, args = [], opts = {}) {
  const payload = buildPayload(variant, keyOrText, args, opts);

  const dedupeMs = Number.isFinite(opts?.dedupeMs) ? opts.dedupeMs : 800; // default dedupe window
  const h = opts?.dedupeKey || hashPayload(payload);
  const now = Date.now();

  if (!opts?.force && dedupeMs > 0) {
    const prev = lastShown.get(h) || 0;
    if (now - prev < dedupeMs) return false; // suppressed
  }
  lastShown.set(h, now);

  emit(payload);
  return true;
}

export const Toast = Object.freeze({
  show,
  info: (k, a, o) => show("info", k, a, o),
  success: (k, a, o) => show("success", k, a, o),
  warning: (k, a, o) => show("warning", k, a, o),
  error: (k, a, o) => show("error", k, a, o),

  // escape hatch if you want to send a fully custom payload
  raw: (payload) => emit(payload),
});

export default Toast;
