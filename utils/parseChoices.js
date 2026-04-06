// utils/parseChoices.js

/**
 * Parse a pipe-separated choices string into an array of { value, label }.
 * Format: "key:Label|key:Label" or "value|value"
 * If no colon, value and label are the same.
 */
export function parseChoices(str) {
  if (!str) return [];
  return String(str)
    .split("|")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        return {
          value: trimmed.slice(0, colonIdx).trim(),
          label: trimmed.slice(colonIdx + 1).trim(),
        };
      }
      return { value: trimmed, label: trimmed };
    })
    .filter(Boolean);
}
