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

    // link-specific: normalize default to {href,text}, ignore options
    if (field.type === "link") {
      const norm = (v) => {
        if (!v) return { href: "", text: "" };
        if (typeof v === "string") return { href: v, text: "" }; // back-compat
        const href = typeof v.href === "string" ? v.href : "";
        const text = typeof v.text === "string" ? v.text : "";
        return { href, text };
      };
      field.default = norm(field.default);
      field.options = []; // not used for link
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
