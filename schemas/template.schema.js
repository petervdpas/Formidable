// modules/template.schema.js

module.exports = {
  defaults: {
    name: "",
    storage_location: "./markdowns/unknown",
    markdown_template: "",
    fields: [],
  },

  sanitize(raw) {
    const obj = { ...this.defaults, ...raw };

    if (!Array.isArray(obj.fields)) obj.fields = [];

    if (typeof obj.markdown_template !== "string") {
      obj.markdown_template = "";
    }

    return obj;
  },
};
