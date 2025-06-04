// schemas/template.schema.js

module.exports = {
  defaults: {
    name: "",
    filename: "",
    storage_location: "./storage/unknown",
    markdown_template: "",
    fields: [],
  },

  sanitize(raw, filename = null) {
    // Merge raw met defaults
    const obj = { ...this.defaults, ...raw };

    if (!Array.isArray(obj.fields)) obj.fields = [];
    if (typeof obj.markdown_template !== "string") obj.markdown_template = "";

    // Bouw object in vaste volgorde
    const result = {
      name: obj.name || "",
      filename: obj.filename || filename || "",
      storage_location: obj.storage_location,
      markdown_template: obj.markdown_template,
      fields: obj.fields,
    };

    // Voeg overige keys toe (voor extensies, extra props)
    for (const key of Object.keys(obj)) {
      if (
        ![
          "name",
          "filename",
          "storage_location",
          "markdown_template",
          "fields",
        ].includes(key)
      ) {
        result[key] = obj[key];
      }
    }

    return result;
  },
};
