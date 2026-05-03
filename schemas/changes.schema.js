// schemas/changes.schema.js

const KNOWN_FILE_OPS = new Set(["create", "update", "delete", "baseline"]);
const KNOWN_OPS = new Set([...KNOWN_FILE_OPS, "sync"]);
const KNOWN_BACKENDS = new Set(["git", "gigot"]);

module.exports = {
  KNOWN_OPS,
  KNOWN_FILE_OPS,
  KNOWN_BACKENDS,

  cursorDefaults: {},

  // Validate and normalize one parsed journal entry. Returns the
  // sanitized entry, or null when the input is malformed (missing
  // required fields, unknown op, unknown backend on a sync marker,
  // etc.). Drops unknown fields silently so a future writer can
  // add new fields without breaking existing readers — they just
  // ignore what they don't recognise.
  sanitizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.ts !== "string" || !raw.ts) return null;
    if (typeof raw.op !== "string" || !KNOWN_OPS.has(raw.op)) return null;

    if (raw.op === "sync") {
      if (typeof raw.backend !== "string" || !KNOWN_BACKENDS.has(raw.backend)) {
        return null;
      }
      const out = { ts: raw.ts, op: "sync", backend: raw.backend };
      if (typeof raw.version === "string" && raw.version) out.version = raw.version;
      if (typeof raw.pushed === "number") out.pushed = raw.pushed;
      if (typeof raw.pulled === "number") out.pulled = raw.pulled;
      return out;
    }

    if (typeof raw.path !== "string" || !raw.path) return null;
    const out = { ts: raw.ts, op: raw.op, path: raw.path };
    if (typeof raw.bytes === "number") out.bytes = raw.bytes;
    return out;
  },

  // Safe-parse one JSONL line. Returns the sanitized entry, or null
  // when the line is empty / unparseable / fails sanitization. Lets
  // a reader walk a partially-corrupted log without throwing.
  parseLine(rawLine) {
    if (typeof rawLine !== "string" || !rawLine.trim()) return null;
    let parsed;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      return null;
    }
    return this.sanitizeEntry(parsed);
  },

  // Sanitize the cursor file payload. Drops unknown-backend keys
  // and non-string values. Returns {cursor, changed} matching the
  // boot/config schema convention so callers can detect drift and
  // optionally rewrite the file.
  sanitizeCursor(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { cursor: { ...this.cursorDefaults }, changed: true };
    }
    const cursor = {};
    let changed = false;
    for (const [k, v] of Object.entries(raw)) {
      if (KNOWN_BACKENDS.has(k) && typeof v === "string" && v) {
        cursor[k] = v;
      } else {
        changed = true;
      }
    }
    return { cursor, changed };
  },
};
