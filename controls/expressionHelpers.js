// controls/expressionHelpers.js

/**
 * Returns a similarity ratio (0–1) between two strings using Levenshtein distance.
 */
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();

  const matrix = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Returns true if the similarity between two strings is ≥ threshold (0–1).
 * Example: isSimilar(F["name"], "audit control", 0.8)
 * or: isSimilar(F["nameA"], F["nameB"], 0.8)
 */
function isSimilar(a, b, threshold = 0.8) {
  return stringSimilarity(a, b) >= threshold;
}

/**
 * Returns the type of the value: "string", "number", "boolean", "object", "array", "null", or "undefined".
 * Example: typeOf(F["amount"]) => "number"
 * Or: [typeOf(F["summary"]) === "string" ? F["summary"] : "⚠️ Not a string"]
 * Or: [typeOf(F["tags"]) === "array"
 *       ? { text: "Tags OK", color: "green" }
 *       : { text: "Tags missing", color: "red" }]
 */
function typeOf(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

/**
 * Returns today's date as YYYY-MM-DD.
 * Example: today() => "2025-07-30"
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns true if the given date is before today, or not present.
 * Example: isOverdue(F["due-date"]) => true if overdue or missing
 */
function isOverdue(val) {
  if (!val) return true;
  return String(val) < today();
}

/**
 * Returns true if the given date is within `days` after today.
 * Example: isDueSoon(F["deadline"], 7) => true if due in next 7 days
 */
function isDueSoon(val, days = 0) {
  if (!val) return false;
  const diff = daysBetween(today(), val);
  return diff >= 0 && diff <= days;
}

/**
 * Returns true if the given date is within `days` before today (overdue or nearly overdue).
 * Example: isOverdueInDays(F["review-date"], 3) => true if within 3 days before today
 */
function isOverdueInDays(val, days = 0) {
  if (!val) return false;
  const diff = daysBetween(val, today());
  return diff >= 0 && diff <= days;
}

/**
 * Returns true if the given date is after today.
 * Example: isFuture(F["planned-date"]) => true if in future
 */
function isFuture(val) {
  if (!val) return false;
  return String(val) > today();
}

/**
 * Returns true if the given date is today.
 * Example: isToday(F["event-date"]) => true if it's today
 */
function isToday(val) {
  if (!val) return false;
  return String(val) === today();
}

/**
 * Returns number of days between two dates (date2 - date1).
 * Example: daysBetween("2025-07-01", "2025-07-30") => 29
 */
function daysBetween(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((d2 - d1) / msPerDay);
  } catch (err) {
    return null;
  }
}

/**
 * Returns the number of days between the given date and today.
 * Example: ageInDays(F["created"]) => days since creation
 */
function ageInDays(val) {
  return daysBetween(val, today());
}

/**
 * Returns the value if it's not null/empty, otherwise returns fallback.
 * Example: defaultText(F["summary"], "No summary") => summary or fallback
 */
function defaultText(val, fallback = "") {
  return val != null && val !== "" ? val : fallback;
}

/**
 * Returns true if the value is not null, undefined, or empty.
 * Works on arrays, strings, numbers, booleans.
 * Example: notEmpty(F["notes"]) => true if filled
 */
function notEmpty(val) {
  if (Array.isArray(val)) return val.length > 0;
  return val != null && val !== "";
}

/**
 * Logs value(s) to console and returns the first argument.
 * Example: log(F["status"]) => logs and returns status
 */
function log(...args) {
  console.log("[miniExpr] log:", ...args);
  return args[0];
}

module.exports = {
  isSimilar,
  typeOf,
  today,
  isOverdue,
  isDueSoon,
  isOverdueInDays,
  isFuture,
  isToday,
  daysBetween,
  ageInDays,
  defaultText,
  notEmpty,
  log,
};
