// utils/opts.js

/**
 * Normalize "options" into a flat { [key]: string } map.
 * Accepts:
 *   - [{ value, label? }, ...]
 *   - [{ key, value }, ...]
 *   - [[key, value], ...]
 *   - ["key=value", "a=b=c", ...]
 *   - { k: v, ... }
 * Returns {} for null/undefined/unsupported.
 */
export function normalizeOptions(opts) {
  if (!opts) return {};

  // Already an object (but not Array/Map)
  if (typeof opts === "object" && !Array.isArray(opts) && !(opts instanceof Map)) {
    return { ...opts };
  }

  // Map
  if (opts instanceof Map) {
    const out = {};
    for (const [k, v] of opts.entries()) out[String(k)] = String(v ?? "");
    return out;
  }

  // Array
  if (Array.isArray(opts)) {
    const out = {};
    for (const it of opts) {
      // { value, label? }
      if (it && typeof it === "object" && "value" in it && !("key" in it)) {
        const k = String(it.value).trim();
        const v = "label" in it ? String(it.label ?? "") : "";
        if (k) out[k] = v;
        continue;
      }

      // { key, value }
      if (it && typeof it === "object" && "key" in it) {
        const k = String(it.key).trim();
        const v = String(it.value ?? "");
        if (k) out[k] = v;
        continue;
      }

      // [key, value]
      if (Array.isArray(it) && it.length >= 2) {
        const k = String(it[0]).trim();
        const v = String(it[1] ?? "");
        if (k) out[k] = v;
        continue;
      }

      // "key=value" (first '=' splits key; rest belong to value)
      if (typeof it === "string" && it.includes("=")) {
        const [k, ...rest] = it.split("=");
        const key = String(k).trim();
        const val = rest.join("=").trim();
        if (key) out[key] = val;
        continue;
      }
    }
    return out;
  }

  // Fallback
  return {};
}
