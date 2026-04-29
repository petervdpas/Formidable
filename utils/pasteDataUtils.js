// utils/pasteDataUtils.js
//
// Dumb-dump parser for clipboard data pasted from Excel / Calc / Sheets.
// Excel copies as TSV (tab-separated, newline-delimited). We also accept
// a couple of other common separators so it Just Works for typed input.
//
// No dedup, no validation, no header detection — caller decides what to do
// with the rows.

const SEPARATORS = ["\t", ";", ","];

/**
 * Pick the most plausible cell separator by counting occurrences on the
 * first non-empty line. Tab wins ties (Excel's native paste format).
 */
function detectSeparator(firstLine) {
  let best = "\t";
  let bestCount = 0;
  for (const sep of SEPARATORS) {
    const n = firstLine.split(sep).length - 1;
    if (n > bestCount) {
      best = sep;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Parse pasted text into a 2D array of strings.
 *   - Splits on \r?\n for rows.
 *   - Drops fully empty trailing lines.
 *   - Auto-detects column separator (tab / ; / ,).
 *
 * Returns: { rows: string[][], separator: string }
 */
export function parsePastedRows(text) {
  if (typeof text !== "string" || !text.length) {
    return { rows: [], separator: "\t" };
  }

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // strip trailing empty lines (Excel often appends one)
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (!lines.length) return { rows: [], separator: "\t" };

  const separator = detectSeparator(lines[0]);
  const rows = lines.map((line) => line.split(separator));
  return { rows, separator };
}

/**
 * For list fields: collapse each row to a single value (the first cell).
 * Empty values are dropped.
 */
export function rowsToListValues(rows) {
  return rows
    .map((row) => (row[0] ?? "").trim())
    .filter((v) => v !== "");
}
