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

const textareaFormats = new Set(["markdown", "plain"]);

module.exports = {
  defaults: {
    key: "",
    type: "text",
    label: "",
    description: "",
    summary_field: "",
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
    field.expression_item = !!field.expression_item;
    field.two_column = !!field.two_column;

    // Only allow summary_field on loopstart
    if (field.type !== "loopstart") {
      field.summary_field = "";
    }

    if (field.type === "textarea") {
      const f = String(field.format || "").toLowerCase();
      field.format = textareaFormats.has(f) ? f : "markdown";
    } else {
      delete field.format;
    }

    return field;
  },
};
