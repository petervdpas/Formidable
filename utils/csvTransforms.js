// utils/csvTransforms.js
// Shared CSV transform rules + field coercion/formatting.
// Used by csvImportModal, csvExportModal, and csvHandlers.

import { matchOption, parseAsList } from "./stringUtils.js";
import { t } from "./i18n.js";

// Field types excluded from CSV mapping (both import and export).
export const excludedTypes = new Set([
  "loopstart", "loopstop", "image", "code", "api",
]);

/**
 * Parse "rowSep colSep" from a single param string.
 * Default: row=";", col=","
 */
function parseSeps(seps) {
  const parts = String(seps || "").split(/\s+/).filter(Boolean);
  return [parts[0] || ";", parts[1] || ","];
}

/**
 * Transform rules. All return strings.
 * `split-table` has two modes:
 *   - "storage" (default): returns JSON-stringified 2D array (for import persistence).
 *   - "preview": returns a human-readable joined form (for UI preview cells).
 */
const rules = {
  none:         (v) => v,
  lowercase:    (v) => v.toLowerCase(),
  uppercase:    (v) => v.toUpperCase(),
  capitalize:   (v) => v.replace(/\b\w/g, (c) => c.toUpperCase()),
  trim:         (v) => v.trim(),
  "trim+lower": (v) => v.trim().toLowerCase(),
  "trim+upper": (v) => v.trim().toUpperCase(),
  "trim+cap":   (v) => v.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
  "first-n":    (v, n) => v.substring(0, n || v.length),
  "last-n":     (v, n) => n ? v.slice(-n) : v,
  split:        (v, sep) => v.split(sep || ",").map((s) => s.trim()).filter(Boolean).join(", "),
  "bool-match": (v, trueVal) => String(v.trim().toLowerCase() === String(trueVal).trim().toLowerCase()),
  "split-table": (v, seps, mode) => {
    const [rs, cs] = parseSeps(seps);
    const grid = v.split(rs).map((r) => r.split(cs).map((c) => c.trim())).filter((r) => r.some(Boolean));
    return mode === "preview"
      ? grid.map((r) => r.join(", ")).join(" | ")
      : JSON.stringify(grid);
  },
};

// Rules that expose an extra param input: { type, placeholder, min?, max? }
export const paramRuleDefs = {
  "first-n":     { type: "number", placeholder: "N", min: "1", max: "999" },
  "last-n":      { type: "number", placeholder: "N", min: "1", max: "999" },
  split:         { type: "text",   placeholder: ", ; |" },
  "bool-match":  { type: "text",   placeholder: null }, // set via i18n at render time
  "split-table": { type: "text",   placeholder: "; ," },
};

export const transformRules = rules;

/**
 * Dropdown options for the transform selector, i18n-resolved.
 * Returns fresh options on each call so language changes are picked up.
 */
export function getTransformOptions() {
  return [
    { value: "none",        label: t("csv.transform.none", "None") },
    { value: "trim",        label: t("csv.transform.trim", "Trim") },
    { value: "lowercase",   label: t("csv.transform.lowercase", "Lowercase") },
    { value: "uppercase",   label: t("csv.transform.uppercase", "Uppercase") },
    { value: "capitalize",  label: t("csv.transform.capitalize", "Capitalize") },
    { value: "trim+lower",  label: t("csv.transform.trimlower", "Trim + Lower") },
    { value: "trim+upper",  label: t("csv.transform.trimupper", "Trim + Upper") },
    { value: "trim+cap",    label: t("csv.transform.trimcap", "Trim + Capitalize") },
    { value: "first-n",     label: t("csv.transform.firstn", "First N chars") },
    { value: "last-n",      label: t("csv.transform.lastn", "Last N chars") },
    { value: "split",       label: t("csv.transform.split", "Split to list") },
    { value: "bool-match",  label: t("csv.transform.boolmatch", "Boolean match") },
    { value: "split-table", label: t("csv.transform.splittable", "Split to table") },
  ];
}

/**
 * Apply a transform rule.
 * `transform` may be a rule-key string, or `{ rule, param }`.
 * Options: `{ mode: "preview" | "storage" }` — only meaningful for split-table.
 */
export function applyTransformRule(val, transform, { mode } = {}) {
  if (!transform) return val;
  const rule = typeof transform === "string" ? transform : transform.rule;
  const param = typeof transform === "object"
    ? (transform.param ?? transform.n ?? "")
    : "";
  const fn = rules[rule];
  return fn ? fn(String(val ?? ""), param, mode) : val;
}

/**
 * Coerce a string value into the correct type for a template field.
 * Used when importing rows into storage.
 */
export function coerceValue(raw, field) {
  const val = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  switch (field.type) {
    case "boolean":
      return ["true", "1", "yes", "on"].includes(val.toLowerCase());

    case "number":
    case "range": {
      const n = Number(val);
      return Number.isFinite(n) ? n : field.type === "range" ? 50 : 0;
    }

    case "date":
      return val || "";

    case "dropdown":
    case "radio":
      return matchOption(val, field.options);

    case "multioption": {
      const items = parseAsList(val);
      return items.map((v) => matchOption(v, field.options));
    }

    case "tags":
    case "list":
      return parseAsList(val);

    case "table": {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
      return [];
    }

    default:
      return val;
  }
}

/**
 * Preview-friendly coerce: returns a string suitable for UI cells.
 * (Mirrors coerceValue but keeps everything as a display string.)
 */
export function previewCoerce(raw, field) {
  const val = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  switch (field.type) {
    case "boolean":
      return ["true", "1", "yes", "on"].includes(val.toLowerCase()) ? "true" : "false";
    case "number":
    case "range": {
      const n = Number(val);
      return Number.isFinite(n) ? String(n) : field.type === "range" ? "50" : "0";
    }
    case "dropdown":
    case "radio":
      return matchOption(val, field.options);
    case "multioption":
      return parseAsList(val).map((v) => matchOption(v, field.options)).join(", ");
    case "tags":
    case "list":
      return parseAsList(val).join(", ");
    default:
      return val;
  }
}

/**
 * Format a stored field value back into a CSV-friendly string (reverse of coerceValue).
 * Used when exporting entries.
 */
export function formatValue(val, field) {
  if (val == null) return "";
  switch (field.type) {
    case "boolean":
      return val === true ? "true" : "false";
    case "number":
    case "range":
      return String(val);
    case "multioption":
    case "tags":
    case "list":
      return Array.isArray(val) ? JSON.stringify(val) : String(val);
    case "table":
      return Array.isArray(val) ? JSON.stringify(val) : "";
    default:
      return String(val);
  }
}
