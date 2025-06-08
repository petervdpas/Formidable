// schemas/template.schema.js

module.exports = {
  defaults: {
    name: "",
    filename: "",
    markdown_template: "",
    fields: [],
  },

  sanitize(raw, filename = null) {
    // Merge raw with defaults
    const obj = { ...this.defaults, ...raw };

    if (!Array.isArray(obj.fields)) obj.fields = [];
    if (typeof obj.markdown_template !== "string") obj.markdown_template = "";

    // Build sanitized object in fixed order
    const result = {
      name: obj.name || "",
      filename: obj.filename || filename || "",
      markdown_template: obj.markdown_template,
      fields: obj.fields,
    };

    // Append any additional/custom keys
    for (const key of Object.keys(obj)) {
      if (!["name", "filename", "markdown_template", "fields"].includes(key)) {
        result[key] = obj[key];
      }
    }

    return result;
  },
};