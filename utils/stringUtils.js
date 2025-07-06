// utils/stringUtils.js

export function sanitize(str) {
  return str.trim().replace(/\s+/g, "-").toLowerCase();
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function combiMerge(parts, params = {}, fallback = "") {
  const inputParts = Array.isArray(parts) ? parts : [parts];

  return inputParts
    .map((part) =>
      typeof part === "string"
        ? part
            .replace(/\$\{(\w+)\}/g, (_, key) => {
              const val = params[key];
              return val != null ? `"${val}"` : fallback;
            })
            .replace(/\{(\w+)\}/g, (_, key) => {
              const val = params[key];
              return val != null ? `"${val}"` : fallback;
            })
        : ""
    )
    .filter(Boolean)
    .join(" ");
}