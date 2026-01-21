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

/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @param {string} format - Format: 'short', 'long', 'time', 'datetime', 'iso' (default: 'datetime')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = "datetime") {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return "Invalid Date";

  const options = {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric", weekday: "long" },
    time: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
    datetime: { 
      year: "numeric", 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    },
    iso: null
  };

  if (format === "iso") return d.toISOString();
  
  const formatOptions = options[format] || options.datetime;
  return new Intl.DateTimeFormat("en-US", formatOptions).format(d);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Relative time string
 */
export function relativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  
  return formatDate(d, "short");
}

/**
 * Text formatter for building multi-line formatted output
 * Provides fluent API for creating markdown-style formatted text
 * @returns {Object} Formatter instance with chainable methods
 */
export function formatText() {
  const lines = [];
  
  const api = {
    // Add raw line
    line(text = "") {
      lines.push(text);
      return api;
    },
    
    // Add blank line
    blank() {
      lines.push("");
      return api;
    },
    
    // Add heading
    h1(text) {
      lines.push(`# ${text}`);
      return api;
    },
    h2(text) {
      lines.push(`## ${text}`);
      return api;
    },
    h3(text) {
      lines.push(`### ${text}`);
      return api;
    },
    
    // Add paragraph
    p(text) {
      lines.push(text, "");
      return api;
    },
    
    // Add bold text
    bold(text) {
      lines.push(`**${text}**`);
      return api;
    },
    
    // Add italic text
    italic(text) {
      lines.push(`_${text}_`);
      return api;
    },
    
    // Add inline code
    code(text) {
      lines.push(`\`${text}\``);
      return api;
    },
    
    // Add code block
    codeBlock(text, lang = "") {
      lines.push(`\`\`\`${lang}`, text, "```", "");
      return api;
    },
    
    // Add list item
    li(text, indent = 0) {
      const prefix = "  ".repeat(indent);
      lines.push(`${prefix}- ${text}`);
      return api;
    },
    
    // Add numbered list item
    oli(text, number, indent = 0) {
      const prefix = "  ".repeat(indent);
      lines.push(`${prefix}${number}. ${text}`);
      return api;
    },
    
    // Add horizontal rule
    hr() {
      lines.push("---", "");
      return api;
    },
    
    // Add blockquote
    quote(text) {
      lines.push(`> ${text}`);
      return api;
    },
    
    // Add key-value pair
    kv(key, value, boldKey = true) {
      const k = boldKey ? `**${key}**` : key;
      lines.push(`- ${k}: ${value}`);
      return api;
    },
    
    // Build and return the formatted string
    toString() {
      return lines.join("\n");
    },
    
    // Get as array of lines
    toArray() {
      return [...lines];
    }
  };
  
  return api;
}