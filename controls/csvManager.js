// controls/csvManager.js

const path = require("path");
const fs = require("fs");
const formManager = require("./formManager");
const templateManager = require("./templateManager");
const { sanitize: sanitizeMeta } = require("../schemas/meta.schema");
const { log, warn, error } = require("./nodeLogger");

// ── CSV parsing ────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of rows (arrays of cell values).
 * Handles quoted fields, embedded commas, embedded newlines, and escaped quotes.
 */
function parseCsv(text, delimiter = ",") {
  const rows = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row = [];
    while (i < len) {
      let value;
      if (text[i] === '"') {
        // quoted field
        i++; // skip opening quote
        let buf = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              buf += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            buf += text[i];
            i++;
          }
        }
        value = buf;
      } else {
        // unquoted field
        const start = i;
        while (i < len && text[i] !== delimiter && text[i] !== "\r" && text[i] !== "\n") {
          i++;
        }
        value = text.substring(start, i);
      }

      row.push(value);

      if (i < len && text[i] === delimiter) {
        i++; // skip delimiter
        continue;
      }
      break;
    }

    // skip line ending
    if (i < len && text[i] === "\r") i++;
    if (i < len && text[i] === "\n") i++;

    rows.push(row);
  }

  // drop trailing empty row
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") rows.pop();
  }

  return rows;
}

// ── Value coercion per field type ──────────────────────────────

const loopTypes = new Set(["loopstart", "loopstop"]);
const skipTypes = new Set(["image", "code", "api", "loopstart", "loopstop"]);

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
      return val;

    case "multioption": {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON, split */ }
      return val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    }

    case "tags": {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON, split */ }
      return val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    }

    case "list": {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON, split */ }
      return val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    }

    case "table": {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
      return [];
    }

    case "textarea":
    case "latex":
      return val;

    case "guid":
      return val;

    case "link":
      return val;

    default:
      return val;
  }
}

// ── Import logic ───────────────────────────────────────────────

/**
 * Parse a CSV file and return headers + rows for the mapping UI.
 *
 * @param {string} filePath  Absolute path to the CSV file
 * @param {string} delimiter CSV delimiter (default: ",")
 * @returns {{ headers: string[], rows: string[][], rowCount: number }}
 */
function previewCsv(filePath, delimiter = ",") {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    const parsed = parseCsv(text, delimiter);
    if (parsed.length < 1) return { headers: [], rows: [], rowCount: 0 };

    const headers = parsed[0];
    const rows = parsed.slice(1);
    return { headers, rows, rowCount: rows.length };
  } catch (err) {
    error("[CsvManager] Failed to preview CSV:", err);
    return { headers: [], rows: [], rowCount: 0, error: err.message };
  }
}

/**
 * Import CSV rows into storage for a given template.
 *
 * @param {object} opts
 * @param {string}   opts.filePath          Absolute path to CSV
 * @param {string}   opts.templateFilename  e.g. "contacts.yaml"
 * @param {object}   opts.mapping           { csvColumn: fieldKey, ... }
 * @param {string}   [opts.delimiter=","]   CSV delimiter
 * @param {string}   [opts.filenameField]   Field key to derive storage filename from
 * @returns {{ success: boolean, imported: number, skipped: number, errors: string[] }}
 */
function importCsv({ filePath, templateFilename, mapping, delimiter = ",", filenameField = "" }) {
  const errors = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Load template to get field definitions
    const template = templateManager.loadTemplate(templateFilename);
    if (!template) {
      return { success: false, imported: 0, skipped: 0, errors: ["Template not found: " + templateFilename] };
    }

    // Build field lookup (skip loop types)
    const fieldMap = new Map();
    for (const f of template.fields) {
      if (!loopTypes.has(f.type)) {
        fieldMap.set(f.key, f);
      }
    }

    // Parse CSV
    const text = fs.readFileSync(filePath, "utf-8");
    const parsed = parseCsv(text, delimiter);
    if (parsed.length < 2) {
      return { success: false, imported: 0, skipped: 0, errors: ["CSV has no data rows"] };
    }

    const headers = parsed[0];
    const dataRows = parsed.slice(1);

    // Resolve mapping: csvColumnIndex -> fieldKey
    const colMapping = [];
    for (const [csvCol, fieldKey] of Object.entries(mapping)) {
      const colIndex = headers.indexOf(csvCol);
      if (colIndex === -1) {
        errors.push(`CSV column "${csvCol}" not found in headers`);
        continue;
      }
      const field = fieldMap.get(fieldKey);
      if (!field) {
        errors.push(`Template field "${fieldKey}" not found or is a loop field`);
        continue;
      }
      colMapping.push({ colIndex, fieldKey, field });
    }

    if (colMapping.length === 0) {
      return { success: false, imported: 0, skipped: 0, errors: ["No valid column-to-field mappings"] };
    }

    // Ensure storage directory exists
    formManager.ensureFormDirectory(templateFilename);

    // Find GUID field key if template has one (for update matching)
    const guidFieldKey = templateManager.getGuidFieldKey(template.fields);

    // Import each row
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];

      try {
        const data = {};
        for (const { colIndex, fieldKey, field } of colMapping) {
          const rawVal = colIndex < row.length ? row[colIndex] : "";
          data[fieldKey] = coerceValue(rawVal, field);
        }

        // Derive filename for the storage entry
        let entryFilename = "";

        // If a GUID column is mapped, use it for matching/filename
        if (guidFieldKey && data[guidFieldKey]) {
          entryFilename = data[guidFieldKey];
        } else if (filenameField && data[filenameField]) {
          entryFilename = sanitizeFilename(String(data[filenameField]));
        } else {
          entryFilename = `import-${Date.now()}-${r}`;
        }

        // Wrap in the meta+data envelope
        const envelope = { data };

        const result = formManager.saveForm(templateFilename, entryFilename, envelope, template.fields);
        if (result.success) {
          imported++;
        } else {
          skipped++;
          errors.push(`Row ${r + 1}: save failed — ${result.error || "unknown"}`);
        }
      } catch (rowErr) {
        skipped++;
        errors.push(`Row ${r + 1}: ${rowErr.message}`);
      }
    }

    return { success: true, imported, skipped, errors };
  } catch (err) {
    error("[CsvManager] importCsv failed:", err);
    return { success: false, imported, skipped, errors: [...errors, err.message] };
  }
}

function sanitizeFilename(str) {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9_\-. ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 80) || "entry";
}

module.exports = {
  parseCsv,
  previewCsv,
  importCsv,
};
