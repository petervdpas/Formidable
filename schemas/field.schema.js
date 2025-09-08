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

const codeDefaults = {
  run_mode: "manual", // "manual" | "load" | "save"
  allow_run: false,

  // execution hints for handler
  input_mode: "safe", // "safe" | "raw"
  api_mode: "frozen", // "frozen" | "raw"
  api_pick: [], // string[]
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

    // valid type?
    if (!knownTypes.includes(field.type)) {
      field.type = "text";
    }

    // options as array
    if (!Array.isArray(field.options)) {
      field.options = [];
    }

    // booleans
    field.expression_item = !!field.expression_item;
    field.two_column = !!field.two_column;

    // summary_field only for loopstart
    if (field.type !== "loopstart") {
      field.summary_field = "";
    }

    // textarea-specific
    if (field.type === "textarea") {
      const f = String(field.format || "").toLowerCase();
      field.format = textareaFormats.has(f) ? f : "markdown";
    } else {
      delete field.format;
    }

    // code-specific
    if (field.type === "code") {
      // merge defaults first so we can normalize after
      Object.assign(field, { ...codeDefaults, ...raw });

      // run_mode
      const rm = String(field.run_mode || "manual").toLowerCase();
      field.run_mode = ["manual", "load", "save"].includes(rm) ? rm : "manual";

      // allow_run
      field.allow_run = !!field.allow_run;

      // input_mode
      const im = String(field.input_mode || "safe").toLowerCase();
      field.input_mode = im === "raw" ? "raw" : "safe";

      // api_mode
      const am = String(field.api_mode || "frozen").toLowerCase();
      field.api_mode = am === "raw" ? "raw" : "frozen";

      // api_pick (top-level keys only, strings, trimmed)
      field.api_pick = Array.isArray(field.api_pick)
        ? field.api_pick
            .filter((k) => typeof k === "string")
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

      // default value must be a string; force multiline so YAML uses block scalar
      field.default = typeof field.default === "string" ? field.default : "";
      if (field.default && !field.default.includes("\n")) {
        field.default += "\n";
      }

      // lock these off for code fields
      field.expression_item = false;
      field.two_column = false;

      // ensure no legacy props linger
      delete field.language;
      delete field.sandbox;
    } else {
      // make sure code-only props don't leak to other types
      delete field.run_mode;
      delete field.allow_run;
      delete field.input_mode;
      delete field.api_mode;
      delete field.api_pick;
      delete field.language;
      delete field.sandbox;
    }

    return field;
  },
};
