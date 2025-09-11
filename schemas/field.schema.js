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
  "latex",
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

const latexDefaults = {
  rows: 12,
  use_fenced: true,
  placeholder: "",
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

    // type check
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

    // latex-specific
    if (field.type === "latex") {
      Object.assign(field, { ...latexDefaults, ...raw });

      // normalize rows
      const rowsNum = Number(field.rows);
      field.rows = Number.isFinite(rowsNum)
        ? Math.max(2, Math.min(60, Math.trunc(rowsNum)))
        : latexDefaults.rows;

      // normalize flags/strings
      field.use_fenced = !!field.use_fenced;
      field.placeholder =
        typeof field.placeholder === "string" ? field.placeholder : "";

      // value must be string (multiline is fine)
      field.default = typeof field.default === "string" ? field.default : "";
      // encourage block-scalar in YAML if short single-line provided
      if (field.default && !field.default.includes("\n")) field.default += "\n";
    } else {
      // scrub latex-only props
      delete field.rows;
      delete field.use_fenced;
      delete field.placeholder;
    }

    // code-specific
    if (field.type === "code") {
      // merge defaults first
      Object.assign(field, { ...codeDefaults, ...raw });

      // normalize run_mode
      const rm = String(field.run_mode || "manual").toLowerCase();
      field.run_mode = ["manual", "load", "save"].includes(rm) ? rm : "manual";

      // normalize allow_run
      field.allow_run = !!field.allow_run;

      // normalize input_mode
      const im = String(field.input_mode || "safe").toLowerCase();
      field.input_mode = im === "raw" ? "raw" : "safe";

      // normalize api_mode
      const am = String(field.api_mode || "frozen").toLowerCase();
      field.api_mode = am === "raw" ? "raw" : "frozen";

      // normalize api_pick
      field.api_pick = Array.isArray(field.api_pick)
        ? field.api_pick
            .filter((k) => typeof k === "string")
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

      // default value must be string; force multiline so YAML block scalar is used
      field.default = typeof field.default === "string" ? field.default : "";
      if (field.default && !field.default.includes("\n")) {
        field.default += "\n";
      }

      // lock these off
      field.expression_item = false;
      field.two_column = false;

      // scrub legacy props
      delete field.language;
      delete field.sandbox;
      delete field.api;
    } else {
      // scrub code-only props
      delete field.run_mode;
      delete field.allow_run;
      delete field.input_mode;
      delete field.api_mode;
      delete field.api_pick;
      delete field.language;
      delete field.sandbox;
      delete field.api;
    }

    return field;
  },
};
