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
    summary_field: "",
    sidebar_item: false,
    expression_item: false,
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

    // Ensure boolean normalization
    field.sidebar_item = !!field.sidebar_item;
    field.expression_item =
      typeof raw.expression_item === "undefined"
        ? !!field.sidebar_item
        : !!raw.expression_item;

    field.two_column = !!field.two_column;

    // Only allow summary_field on loopstart
    if (field.type !== "loopstart") {
      field.summary_field = "";
    }

    return field;
  },
};
