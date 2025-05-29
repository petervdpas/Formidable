// utils/stringUtils.js

export function sanitize(str) {
  return str.trim().replace(/\s+/g, "-").toLowerCase();
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
