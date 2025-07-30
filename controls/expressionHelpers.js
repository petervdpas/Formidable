// controls/expressionHelpers.js

const { log: logging } = require("./nodeLogger");

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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
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
 */
function isSimilar(a, b, threshold = 0.8) {
  return stringSimilarity(a, b) >= threshold;
}

/**
 * Returns the type of the value.
 * Example: typeOf(F["amount"]) => "number"
 */
function typeOf(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function normalizeDate(input) {
  if (!input || typeof input !== "string") return input;
  if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return input;
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns true if the given date is before today or not present.
 * Example: isOverdue(F["due-date"])
 */
function isOverdue(val) {
  if (!val) return true;
  return normalizeDate(val) < today();
}

/**
 * Returns true if the given date is after today.
 * Example: isFuture(F["start-date"])
 */
function isFuture(val) {
  if (!val) return false;
  return normalizeDate(val) > today();
}

/**
 * Returns true if the given date is today.
 * Example: isToday(F["event-date"])
 */
function isToday(val) {
  if (!val) return false;
  return normalizeDate(val) === today();
}

/**
 * Returns number of days between two dates (date2 - date1).
 * Example: daysBetween("2025-07-01", "2025-07-30") => 29
 */
function daysBetween(date1, date2) {
  try {
    const d1 = new Date(normalizeDate(date1));
    const d2 = new Date(normalizeDate(date2));
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((d2 - d1) / msPerDay);
  } catch {
    return null;
  }
}

/**
 * Returns true if date is within `days` after today.
 * Example: isDueSoon(F["deadline"], 7)
 */
function isDueSoon(val, days = 0) {
  if (!val) return false;
  const diff = daysBetween(today(), normalizeDate(val));
  return diff >= 0 && diff <= days;
}

/**
 * Returns true if date is within `days` before today.
 * Example: isOverdueInDays(F["review-date"], 3)
 */
function isOverdueInDays(val, days = 0) {
  if (!val) return false;
  const diff = daysBetween(normalizeDate(val), today());
  return diff >= 0 && diff <= days;
}

/**
 * Returns true if (val + days) is before today (i.e. expired).
 * Example: isExpiredAfter("2025-07-01", 30) => true on 2025-07-30
 */
function isExpiredAfter(val, days = 0) {
  if (!val) return true;
  const base = new Date(normalizeDate(val));
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10) < today();
}

/**
 * Returns true if today is before (val - days).
 * Example: isUpcomingBefore("2025-08-01", 5) => true on 2025-07-25
 */
function isUpcomingBefore(val, days = 0) {
  if (!val) return false;
  const base = new Date(normalizeDate(val));
  base.setDate(base.getDate() - days);
  return base.toISOString().slice(0, 10) > today();
}

/**
 * Returns how many days since the given date.
 * Example: ageInDays(F["created"])
 */
function ageInDays(val) {
  return daysBetween(val, today());
}

/**
 * Returns fallback if value is empty.
 * Example: defaultText(F["summary"], "No summary")
 */
function defaultText(val, fallback = "") {
  return val != null && val !== "" ? val : fallback;
}

/**
 * Returns true if value is not null/empty.
 */
function notEmpty(val) {
  if (Array.isArray(val)) return val.length > 0;
  return val != null && val !== "";
}

/**
 * Logs value(s) and returns first one.
 * Example: debug(F["status"])
 */
function debug(...args) {
  logging("[miniExpr] debug:", ...args);
  return args[0];
}

module.exports = {
  isSimilar,
  typeOf,
  today,
  isOverdue,
  isDueSoon,
  isOverdueInDays,
  isExpiredAfter,
  isUpcomingBefore,
  isFuture,
  isToday,
  daysBetween,
  ageInDays,
  defaultText,
  notEmpty,
  debug,
};
