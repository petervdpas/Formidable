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

export function toCamel(str) {
  return str.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

export function toSnake(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function truncate(str, max = 50) {
  if (typeof str !== "string") return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export function withDefault(str, alt = "") {
  return str == null || str === "" ? alt : str;
}