// modules/template.schema.js

module.exports = {
  defaults: {
    name: "",
    markdown_dir: "./markdowns/unknown",
    fields: [],
  },

  sanitize(raw) {
    const obj = { ...this.defaults, ...raw };
    if (!Array.isArray(obj.fields)) obj.fields = [];

    return obj;
  },
};
