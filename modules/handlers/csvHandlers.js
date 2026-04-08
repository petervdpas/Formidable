// modules/handlers/csvHandlers.js

import { EventBus } from "../eventBus.js";
import { matchOption, parseAsList, sanitize, isValidGuid } from "../../utils/stringUtils.js";

// Field types excluded from CSV mapping
const excludedTypes = new Set([
  "loopstart", "loopstop", "image", "code", "api",
]);

/**
 * Handle: csv:preview
 * Load a CSV file and return headers + row preview.
 */
export async function handleCsvPreview({ filePath, delimiter }, respond) {
  try {
    const result = await window.api.csv.csvPreview(filePath, delimiter);
    respond?.(result);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[csvHandlers] Preview failed:", err]);
    const fallback = { headers: [], rows: [], rowCount: 0, error: err.message };
    respond?.(fallback);
    return fallback;
  }
}

/**
 * Handle: csv:import:transformRow
 * Coerce a single raw CSV row into typed field values.
 *
 * Payload: { row: string[], colMapping: [{colIndex, fieldKey, field, transform?}] }
 *           transform is { rule, n? } or a string
 * Returns: { [fieldKey]: coercedValue }
 *
 * Supports concat: multiple colMapping entries with the same fieldKey
 * are joined with a space before coercion.
 */
export function handleTransformRow({ row, colMapping, concatSeparator = " " }, respond) {
  // Group by fieldKey to support concat
  const groups = new Map();
  for (const entry of colMapping) {
    const { colIndex, fieldKey, transform } = entry;
    let rawVal = colIndex < row.length ? row[colIndex] : "";
    rawVal = applyTransformRule(rawVal, transform);
    if (!groups.has(fieldKey)) groups.set(fieldKey, { field: entry.field, parts: [] });
    groups.get(fieldKey).parts.push(rawVal);
  }

  const data = {};
  for (const [fieldKey, { field, parts }] of groups) {
    const combined = parts.join(concatSeparator);
    data[fieldKey] = coerceValue(combined, field);
  }

  respond?.(data);
  return data;
}

// ── Transform rules (shared with csvImportModal.js) ───────────
const transformRules = {
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
  "split-table": (v, seps) => {
    const parts = String(seps || "").split(/\s+/).filter(Boolean);
    const rs = parts[0] || ";";
    const cs = parts[1] || ",";
    return JSON.stringify(v.split(rs).map((r) => r.split(cs).map((c) => c.trim())).filter((r) => r.some(Boolean)));
  },
};

function applyTransformRule(val, transform) {
  if (!transform) return val;
  const rule = typeof transform === "string" ? transform : transform.rule;
  const param = typeof transform === "object" ? (transform.param ?? transform.n ?? "") : "";
  const fn = transformRules[rule];
  return fn ? fn(String(val), param) : val;
}

/**
 * Handle: csv:import:saveRow
 * Save a single transformed row to storage via IPC.
 *
 * Payload: { templateFilename, entryFilename, data, fields }
 * Returns: { success, error? }
 */
export async function handleSaveRow({ templateFilename, entryFilename, data, meta, fields }, respond) {
  try {
    const result = await window.api.csv.csvImportRow(
      templateFilename, entryFilename, data, meta, fields
    );
    respond?.(result);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[csvHandlers] Save row failed:", err]);
    const fallback = { success: false, error: err.message };
    respond?.(fallback);
    return fallback;
  }
}

/**
 * Handle: csv:import
 * Orchestrate the full import: transform each row, then save it.
 *
 * Payload: { rows, headers, templateFilename, mapping, transforms, fields, filenameField, guidFieldKey }
 */
export async function handleCsvImport(opts, respond) {
  const {
    rows, headers, templateFilename, mapping,
    transforms = {}, concatSeparator = " ",
    fields, filenameField, guidFieldKey,
  } = opts;

  let imported = 0;
  let skipped = 0;
  const errors = [];

  // Build field lookup
  const fieldMap = new Map();
  for (const f of fields) {
    if (!excludedTypes.has(f.type)) fieldMap.set(f.key, f);
  }

  // Resolve column mapping: csvColumnIndex → { fieldKey, field, transform }
  const colMapping = [];
  for (const [csvCol, fieldKey] of Object.entries(mapping)) {
    const colIndex = headers.indexOf(csvCol);
    if (colIndex === -1) continue;
    const field = fieldMap.get(fieldKey);
    if (!field) continue;
    const transform = transforms[csvCol] || null;
    colMapping.push({ colIndex, fieldKey, field, transform });
  }

  // Check if GUID field exists but isn't mapped → auto-generate per row
  const guidMapped = guidFieldKey && colMapping.some((c) => c.fieldKey === guidFieldKey);

  // Ensure storage directory exists
  await window.api.forms.ensureFormDir(templateFilename);

  // Load user config for meta (author, template name)
  const config = await window.api.config.loadUserConfig();
  const templateName = templateFilename.replace(/\.yaml$/, "");
  const baseMeta = {
    author_name: config?.author_name || "Unknown",
    author_email: config?.author_email || "",
    template: templateFilename,
  };

  for (let r = 0; r < rows.length; r++) {
    try {
      // Step 1: transform row via event
      const data = await EventBus.emitWithResponse("csv:import:transformRow", {
        row: rows[r], colMapping, concatSeparator,
      });

      // GUID handling: auto-generate if unmapped, validate if mapped
      if (guidFieldKey) {
        if (!guidMapped) {
          data[guidFieldKey] = crypto.randomUUID();
        } else if (!isValidGuid(data[guidFieldKey])) {
          errors.push(`Row ${r + 1}: invalid GUID "${data[guidFieldKey]}" — generated new one`);
          data[guidFieldKey] = crypto.randomUUID();
        }
      }

      // Step 2: derive entry filename
      let entryFilename = "";
      if (filenameField && data[filenameField]) {
        entryFilename = sanitize(String(data[filenameField]));
      } else {
        entryFilename = `import-${Date.now()}-${r}`;
      }

      // Step 3: save row via event (with meta)
      const result = await EventBus.emitWithResponse("csv:import:saveRow", {
        templateFilename, entryFilename, data, meta: baseMeta, fields,
      });

      if (result?.success) {
        imported++;
      } else {
        skipped++;
        errors.push(`Row ${r + 1}: ${result?.error || "save failed"}`);
      }
    } catch (err) {
      skipped++;
      errors.push(`Row ${r + 1}: ${err.message}`);
    }

    // Progress event
    EventBus.emit("csv:import:progress", {
      row: r + 1, total: rows.length, imported, skipped,
    });
  }

  const result = { success: imported > 0, imported, skipped, errors };
  respond?.(result);
  return result;
}

// ── Coercion (used by handleTransformRow) ─────────────────────

function coerceValue(raw, field) {
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
