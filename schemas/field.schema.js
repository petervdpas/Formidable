// schemas/field.schema.js

const knownTypes = [
  "guid",
  "loopstart",
  "loopstop",
  "text",
  "boolean",
  "dropdown",
  "multioption",
  "radio",
  "textarea",
  "number",
  "range",
  "date",
  "list",
  "table",
  "image",
  "link",
  "tags",
];

module.exports = {
  defaults: {
    key: "",
    type: "text",
    label: "",
    description: "",
    sidebar_item: false,
    two_column: false,
    default: "",
    options: [],
  },

  sanitize(raw) {
    const field = { ...this.defaults, ...raw };

    // Sanity: valid type?
    if (!knownTypes.includes(field.type)) {
      field.type = "text"; // fallback
    }

    // Clean up options
    if (!Array.isArray(field.options)) {
      field.options = [];
    }

    return field;
  },
};