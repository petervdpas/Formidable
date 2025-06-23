// schemas/field.schema.js

const knownTypes = [
  "guid",
  "loopstart",
  "loopstop",
  "construct",
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
    fields: [],
  },

  sanitize(raw) {
    const field = { ...this.defaults, ...raw };

    // Sanity: valid type?
    if (!knownTypes.includes(field.type)) {
      field.type = "text"; // fallback
    }

    // Loop types or simple types: no subfields
    if (field.type !== "construct") {
      field.fields = [];
    } else {
      // Recursively sanitize fields inside construct
      field.fields = Array.isArray(field.fields)
        ? field.fields.map((f) => this.sanitize(f))
        : [];
    }

    // Basic cleanups
    if (!Array.isArray(field.options)) field.options = [];

    return field;
  },
};
