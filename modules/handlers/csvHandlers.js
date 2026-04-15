// modules/handlers/csvHandlers.js

import { EventBus } from "../eventBus.js";
import { sanitize, isValidGuid } from "../../utils/stringUtils.js";
import {
  excludedTypes,
  applyTransformRule,
  coerceValue,
  formatValue,
} from "../../utils/csvTransforms.js";

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
 *           transform is { rule, param? } or a string
 * Returns: { [fieldKey]: coercedValue }
 *
 * Supports concat: multiple colMapping entries with the same fieldKey
 * are joined with concatSeparator before coercion.
 */
export function handleTransformRow({ row, colMapping, concatSeparator = " " }, respond) {
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

    EventBus.emit("csv:import:progress", {
      row: r + 1, total: rows.length, imported, skipped,
    });
  }

  const result = { success: imported > 0, imported, skipped, errors };
  respond?.(result);
  return result;
}

// ── Export ─────────────────────────────────────────────────────

/**
 * Build one output CSV cell for a given entry, based on a column spec.
 *
 * Column spec:
 *   { header, sourceKeys: [fieldKey, ...], separator?, transform? }
 *
 * If sourceKeys has one entry  → plain export of that field.
 * If sourceKeys has 2+ entries → concat of field values with separator, then optional transform.
 */
function buildExportCell(entry, colSpec, fieldMap) {
  const { sourceKeys = [], separator = " ", transform = null } = colSpec;
  if (sourceKeys.length === 0) return "";

  const parts = sourceKeys.map((key) => {
    const field = fieldMap.get(key);
    return field ? formatValue(entry?.[key], field) : "";
  });

  const joined = parts.length === 1 ? parts[0] : parts.join(separator);

  // For single-source plain columns, the transform applies on the formatted value.
  // For computed columns, the transform applies on the joined string.
  return applyTransformRule(joined, transform, { mode: "storage" });
}

/**
 * Handle: csv:export
 * Export template entries to a CSV file, with user-selected columns
 * and optional computed (concat) columns.
 *
 * Payload (from csvExportModal):
 *   {
 *     templateFilename,
 *     columns: [{ header, sourceKeys: [...], separator?, transform? }],
 *     filePath  (destination; modal picked via save-dialog),
 *   }
 *
 * If called with no payload (legacy menu → EventBus.emit("csv:export")),
 * falls back to exporting all non-excluded fields using field.key as header.
 */
export async function handleCsvExport(opts, respond) {
  const tmpl = window.currentSelectedTemplate;
  const templateFilename =
    opts?.templateFilename
    || ((window.currentSelectedTemplateName || "").endsWith(".yaml")
      ? window.currentSelectedTemplateName
      : `${window.currentSelectedTemplateName || ""}.yaml`);

  if (!tmpl || !templateFilename) {
    EventBus.emit("logging:warning", ["[csvExport] No template selected"]);
    respond?.({ success: false, error: "No template selected" });
    return;
  }

  const allFields = (tmpl.fields || []).filter(
    (f) => f.key && !excludedTypes.has(f.type)
  );
  const fieldMap = new Map(allFields.map((f) => [f.key, f]));

  // Resolve columns: prefer payload, else default to one column per field.
  let columns = Array.isArray(opts?.columns) && opts.columns.length > 0
    ? opts.columns
    : allFields.map((f) => ({ header: f.key, sourceKeys: [f.key] }));

  // Resolve destination path
  let filePath = opts?.filePath;
  if (!filePath) {
    const templateName = templateFilename.replace(/\.yaml$/, "");
    filePath = await window.api.dialog.chooseSaveFile({
      defaultPath: `${templateName}-export.csv`,
      extensions: ["csv"],
    });
  }
  if (!filePath) {
    respond?.({ success: false, error: "Cancelled" });
    return;
  }

  try {
    const files = await window.api.forms.listForms(templateFilename);
    if (!files || files.length === 0) {
      EventBus.emit("logging:warning", ["[csvExport] No entries to export"]);
      respond?.({ success: false, error: "No entries to export" });
      return;
    }

    const headerRow = columns.map((c) => c.header);
    const rows = [headerRow];

    for (const filename of files) {
      const form = await window.api.forms.loadForm(templateFilename, filename, tmpl.fields);
      if (!form?.data) continue;

      const row = columns.map((col) => buildExportCell(form.data, col, fieldMap));
      rows.push(row);

      EventBus.emit("csv:export:progress", {
        current: rows.length - 1,
        total: files.length,
      });
    }

    const result = await window.api.csv.csvWrite(filePath, rows, opts?.delimiter || ",");

    if (result.success) {
      const { Toast } = await import("../../utils/toastUtils.js");
      Toast.success("csv.export.success", [rows.length - 1]);
    }

    respond?.(result);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[csvExport] Export failed:", err]);
    respond?.({ success: false, error: err.message });
  }
}
