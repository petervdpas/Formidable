// utils/templateValidation.js

export function formatError(error) {
  if (error.type === "duplicate-keys") {
    return `Duplicate keys: ${error.keys.join(", ")}`;
  }
  if (error.type === "unmatched-loopstart") {
    return `Unmatched loop start at: ${error.field?.key || "?"}`;
  }
  if (error.type === "unmatched-loopstop") {
    return `Unmatched loop stop at: ${error.field?.key || "?"}`;
  }
  if (error.type === "invalid-template") {
    return `Invalid template: ${error.message}`;
  }
  return `Unknown error: ${JSON.stringify(error)}`;
}
