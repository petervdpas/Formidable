// schemas/meta.schema.js

module.exports = {
  sanitize(
    raw = {},
    templateFields = [],
    {
      templateName = "unknown",
      author_name = "unknown",
      author_email = "unknown@example.com",
      created = null,
      updated = null,
      flagged = false,
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

    return {
      meta: {
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
      },
      data: result,
    };
  },
};

function extractLoopGroup(fields, start, loopKey) {
  const keys = [];
  let end = start;
  while (
    end < fields.length &&
    !(fields[end].type === "loopstop" && fields[end].key === loopKey)
  ) {
    keys.push(fields[end].key);
    end++;
  }
  return { keys, endIndex: end };
}

function getDefaultForType(type) {
  switch (type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "multioption":
    case "list":
    case "table":
      return [];
    default:
      return "";
  }
}
