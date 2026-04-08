// modules/handlers/csvHandlers.js

import { EventBus } from "../eventBus.js";

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
 * Handle: csv:import
 * Run the actual import with the provided mapping.
 */
export async function handleCsvImport(opts, respond) {
  try {
    const result = await window.api.csv.csvImport(opts);
    respond?.(result);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[csvHandlers] Import failed:", err]);
    const fallback = { success: false, imported: 0, skipped: 0, errors: [err.message] };
    respond?.(fallback);
    return fallback;
  }
}
