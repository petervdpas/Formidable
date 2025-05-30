// modules/meta.schema.js

module.exports = {
  sanitize(raw = {}, templateFields = []) {
    const result = {};
    const skipKeys = new Set();

    for (let i = 0; i < templateFields.length; i++) {
      const field = templateFields[i];

      if (field.type === "loopstart") {
        const loopKey = field.key;
        result[loopKey] = raw[loopKey] || [];

        // Verzamel child keys zodat we ze niet per ongeluk in root meenemen
        const group = [];
        let j = i + 1;
        while (
          j < templateFields.length &&
          !(
            templateFields[j].type === "loopstop" &&
            templateFields[j].key === loopKey
          )
        ) {
          group.push(templateFields[j]);
          skipKeys.add(templateFields[j].key);
          j++;
        }

        i = j; // overslaan tot en met loopstop
      } else if (!skipKeys.has(field.key)) {
        const fallback = field.default ?? getDefaultForType(field.type);
        result[field.key] =
          raw[field.key] !== undefined ? raw[field.key] : fallback;
      }
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
