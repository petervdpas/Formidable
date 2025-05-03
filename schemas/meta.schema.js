// modules/meta.schema.js

module.exports = {
  sanitize(raw = {}, templateFields = []) {
    const result = {};

    for (const field of templateFields) {
      const key = field.key;
      const fallback = field.default ?? getDefaultForType(field.type);

      result[key] = raw[key] !== undefined ? raw[key] : fallback;
    }

    return result;
  },
};

// Optional helper for smarter fallback defaults based on type
function getDefaultForType(type) {
  switch (type) {
    case "boolean":
      return false;
    case "dropdown":
      return "";
    case "text":
      return "";
    default:
      return "";
  }
}
