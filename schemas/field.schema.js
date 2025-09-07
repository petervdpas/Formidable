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
  "code",
];

const textareaFormats = new Set(["markdown", "plain"]);
const codeLanguages = new Set(["javascript"]);

const codeDefaults = {
  language: "javascript",
  run_mode: "manual", // "manual" | "load" | "save"
  allow_run: false,
  sandbox: true,
};

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

    // code-specific
    if (field.type === "code") {
      // merge code-only defaults now
      Object.assign(field, { ...codeDefaults, ...raw });

      const lang = String(field.language || "javascript").toLowerCase();
      field.language = codeLanguages.has(lang) ? lang : "javascript";

      const rm = String(field.run_mode || "manual").toLowerCase();
      field.run_mode = ["manual", "load", "save"].includes(rm) ? rm : "manual";

      field.allow_run = !!field.allow_run;
      field.sandbox = field.sandbox !== false;
      field.default = typeof field.default === "string" ? field.default : "";

      // Force multiline so js-yaml emits a block scalar (| or |-)
      if (field.default && !field.default.includes("\n")) {
        field.default += "\n";
      }

      field.expression_item = false;
      field.two_column = false;
    } else {
      // make sure no code props leak into other types
      delete field.language;
      delete field.run_mode;
      delete field.allow_run;
      delete field.sandbox;
    }

    return field;
  },
};
