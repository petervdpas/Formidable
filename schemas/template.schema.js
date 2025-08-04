// schemas/template.schema.js

const fieldSchema = require("./field.schema.js");

module.exports = {
  defaults: {
    name: "",
    filename: "",
    markdown_template: "",
    sidebar_expression: "",
    enable_collection: false,
    fields: [],
  },

  sanitize(raw, filename = null) {
    const obj = { ...this.defaults, ...raw };

    if (typeof obj.markdown_template !== "string") obj.markdown_template = "";

    const result = {
      name: obj.name || "",
      filename: obj.filename || filename || "",
      markdown_template: obj.markdown_template || "",
      sidebar_expression: obj.sidebar_expression || "",
      enable_collection: obj.enable_collection === true,
      fields: Array.isArray(obj.fields)
        ? obj.fields.map((f) => fieldSchema.sanitize(f))
        : [],
    };

    // Append any unknown keys
    for (const key of Object.keys(obj)) {
      if (
        ![
          "name",
          "filename",
          "markdown_template",
          "sidebar_expression",
          "enable_collection",
          "fields",
        ].includes(key)
      ) {
        result[key] = obj[key];
      }
    }

    return result;
  },
};
