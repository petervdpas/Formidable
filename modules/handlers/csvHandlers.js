// modules/handlers/csvHandlers.js

import { EventBus } from "../eventBus.js";
import { matchOption, parseAsList, sanitize } from "../../utils/stringUtils.js";

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
 * Payload: { row: string[], colMapping: [{colIndex, fieldKey, field}] }
 * Returns: { [fieldKey]: coercedValue }
 */
export function handleTransformRow({ row, colMapping }, respond) {
  const data = {};
  for (const { colIndex, fieldKey, field } of colMapping) {
    const rawVal = colIndex < row.length ? row[colIndex] : "";
    data[fieldKey] = coerceValue(rawVal, field);
  }
  respond?.(data);
  return data;
}

/**
 * Handle: csv:import:saveRow
 * Save a single transformed row to storage via IPC.
 *
 * Payload: { templateFilename, entryFilename, data, fields }
 * Returns: { success, error? }
 */
export async function handleSaveRow({ templateFilename, entryFilename, data, fields }, respond) {
  try {
    const result = await window.api.csv.csvImportRow(
      templateFilename, entryFilename, data, fields
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
 * Payload: { rows, headers, templateFilename, mapping, fields, filenameField, guidFieldKey }
 */
export async function handleCsvImport(opts, respond) {
  const {
    rows, headers, templateFilename, mapping,
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

  // Resolve column mapping: csvColumnIndex → { fieldKey, field }
  const colMapping = [];
  for (const [csvCol, fieldKey] of Object.entries(mapping)) {
    const colIndex = headers.indexOf(csvCol);
    if (colIndex === -1) continue;
    const field = fieldMap.get(fieldKey);
    if (!field) continue;
    colMapping.push({ colIndex, fieldKey, field });
  }

  // Ensure storage directory exists
  await window.api.forms.ensureFormDir(templateFilename);

  for (let r = 0; r < rows.length; r++) {
    try {
      // Step 1: transform row via event
      const data = await EventBus.emitWithResponse("csv:import:transformRow", {
        row: rows[r], colMapping,
      });

      // Step 2: derive entry filename
      let entryFilename = "";
      if (guidFieldKey && data[guidFieldKey]) {
        entryFilename = data[guidFieldKey];
      } else if (filenameField && data[filenameField]) {
        entryFilename = sanitize(String(data[filenameField]));
      } else {
        entryFilename = `import-${Date.now()}-${r}`;
      }

      // Step 3: save row via event
      const result = await EventBus.emitWithResponse("csv:import:saveRow", {
        templateFilename, entryFilename, data, fields,
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
