// controls/csvManager.js

const fs = require("fs");
const { log, error } = require("./nodeLogger");

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

/**
 * Parse a CSV file and return headers + all rows as raw strings.
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
 * Escape and quote a CSV cell value.
 */
function csvCell(val, delimiter = ",") {
  const s = String(val ?? "");
  if (s.includes('"') || s.includes(delimiter) || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Write rows (array of arrays) to a CSV file.
 *
 * @param {string}     filePath   Absolute path to write
 * @param {string[][]} rows       Array of rows (first row = headers)
 * @param {string}     delimiter  CSV delimiter (default: ",")
 * @returns {{ success: boolean, error?: string }}
 */
function writeCsv(filePath, rows, delimiter = ",") {
  try {
    const lines = rows.map((row) =>
      row.map((cell) => csvCell(cell, delimiter)).join(delimiter)
    );
    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
    log("[CsvManager] Wrote CSV:", filePath);
    return { success: true };
  } catch (err) {
    error("[CsvManager] Failed to write CSV:", err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  parseCsv,
  previewCsv,
  writeCsv,
};
