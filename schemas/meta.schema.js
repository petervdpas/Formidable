// schemas/meta.schema.js

module.exports = {
  sanitize(
    raw = {},
    templateFields = [],
    {
      id = null,
      templateName = "unknown",
      author_name = "Unknown",
      author_email = "unknown@example.com",
      created = null,
      updated = null,
      flagged = false,
      tags = [],
    } = {}
  ) {
    const rawData = raw.data || raw;
    const rawMeta = raw.meta || {};
    const injected = raw._meta || {};

    const result = {};
    const skip = new Set();

    for (let i = 0; i < templateFields.length; i++) {
      const f = templateFields[i];
      if (f.type === "loopstart") {
        const loopKey = f.key;
        result[loopKey] = rawData[loopKey] || [];
        const { keys, endIndex } = extractLoopGroup(
          templateFields,
          i + 1,
          loopKey
        );
        keys.forEach((k) => skip.add(k));
        i = endIndex;
      } else if (!skip.has(f.key)) {
        const fallback = f.default ?? getDefaultForType(f.type);
        result[f.key] =
          rawData[f.key] !== undefined ? rawData[f.key] : fallback;
      }
    }

    // Guarantee id present (even null)
    const resolvedId =
      id ||
      rawMeta.id ||
      injected.id ||
      rawData.id ||
      (templateFields.some((f) => f.type === "guid") ? null : undefined);

          // ── Collect tags from 'tags' fields + merge with provided/injected/meta ──
    const collected = [];

    // from options.tags (highest intent)
    if (Array.isArray(tags)) {
      for (const t of tags) pushNorm(collected, t);
    }

    // from raw.meta.tags / injected.tags (back-compat)
    if (Array.isArray(rawMeta.tags)) {
      for (const t of rawMeta.tags) pushNorm(collected, t);
    }
    if (Array.isArray(injected.tags)) {
      for (const t of injected.tags) pushNorm(collected, t);
    }

    // from actual data fields of type "tags"
    for (const f of templateFields) {
      if (f.type !== "tags") continue;
      const v = result[f.key];
      if (Array.isArray(v)) {
        for (const t of v) pushNorm(collected, typeof t === "string" ? t : t?.value);
      } else if (typeof v === "string") {
        for (const piece of v.split(/[,;]/)) pushNorm(collected, piece);
      }
    }

    const uniqueTags = [...new Set(collected)].sort((a, b) => a.localeCompare(b));

    return {
      meta: {
        id: resolvedId,
        author_name: rawMeta.author_name || injected.author_name || author_name,
        author_email:
          rawMeta.author_email || injected.author_email || author_email,
        template: rawMeta.template || injected.template || templateName,
        created:
          rawMeta.created ||
          injected.created ||
          created ||
          new Date().toISOString(),
        updated: updated || injected.updated || new Date().toISOString(),
        flagged: rawMeta.flagged ?? injected.flagged ?? flagged,
        tags: uniqueTags,
      },
      data: result,
    };
  },
};

function extractLoopGroup(fields, start, loopKey, depth = 1) {
  const keys = [];
  let end = start;

  while (
    end < fields.length &&
    !(fields[end].type === "loopstop" && fields[end].key === loopKey)
  ) {
    const f = fields[end];
    if (f.type === "loopstart") {
      if (depth >= 2) {
        throw new Error(
          `[Schema Error] Loop nesting exceeds max depth of 2: "${loopKey}" contains nested loop "${f.key}"`
        );
      }

      // Recurse and skip inner loop group
      const { keys: innerKeys, endIndex } = extractLoopGroup(
        fields,
        end + 1,
        f.key,
        depth + 1
      );
      keys.push(...innerKeys);
      end = endIndex;
    } else {
      keys.push(f.key);
      end++;
    }
  }

  return { keys, endIndex: end };
}

function getDefaultForType(type) {
  switch (type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "range":
      return 50;
    case "multioption":
    case "list":
    case "table":
      return [];
    default:
      return "";
  }
}

function pushNorm(arr, tag) {
  if (typeof tag !== "string") return;
  const n = tag.trim().toLowerCase();
  if (n) arr.push(n);
}
