// utils/dateUtils.js

export function getCompactDate(dateValue = new Date()) {
  return dateValue.toISOString().slice(0, 10).replaceAll("-", "");
}

export function getISODate(dateValue = new Date()) {
  return dateValue.toISOString().slice(0, 10);
}

export function getPrettyDate(dateValue = new Date()) {
  return dateValue.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getPrettyDateTime(dateValue = new Date()) {
  return dateValue.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}