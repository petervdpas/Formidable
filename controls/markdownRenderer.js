// controls/markdownRenderer.js

const Handlebars = require("handlebars");
const { log, error } = require("./nodeLogger");

const defaultRenderers = {
  list: (value) => (value || []).map((v) => `- ${v}`).join("\n"),
  table: (value = []) =>
    value.map((row) => `| ${row.join(" | ")} |`).join("\n"),
  boolean: (v) => (v ? "✅ Yes" : "❌ No"),
  text: (v) => v || "",
  number: (v) => `${v}`,
  date: (v) => `${v}`,
  dropdown: (v, field) => {
    const opt = (field.options || []).find((o) =>
      typeof o === "string" ? o === v : o.value === v
    );
    return typeof opt === "string" ? opt : opt?.label || v;
  },
  radio: (v, field) => {
    const opt = (field.options || []).find((o) =>
      typeof o === "string" ? o === v : o.value === v
    );
    return typeof opt === "string" ? opt : opt?.label || v;
  },
  multioption: (v, field) => {
    if (!Array.isArray(v)) return "";
    const options = field.options || [];
    const map = new Map(
      options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label ?? o.value;
        return [val, label];
      })
    );
    return v.map((val) => map.get(val) || val).join(", ");
  },
  textarea: (v) => v,
};

function registerHelpers() {
  Handlebars.registerHelper("json", (value) => {
    return new Handlebars.SafeString(JSON.stringify(value, null, 2));
  });
  Handlebars.registerHelper("log", function (value) {
    return `\n[LOG] ${JSON.stringify(value, null, 2)}\n`;
  });

  Handlebars.registerHelper("eq", (a, b) => a === b);

  Handlebars.registerHelper("length", (arr) =>
    Array.isArray(arr) ? arr.length : 0
  );

  Handlebars.registerHelper("subtract", (a, b) => a - b);

  Handlebars.registerHelper("isSelected", function (array, value, options) {
    console.log("[Renderer] isSelected called with:", { array, value });
    return Array.isArray(array) && array.includes(value)
      ? options.fn(this)
      : options.inverse(this);
  });

  Handlebars.registerHelper(
    "includes",
    (array, value) => Array.isArray(array) && array.includes(value)
  );

  Handlebars.registerHelper("lookupOption", function (options, value) {
    if (!Array.isArray(options)) return { value, label: value };

    const found = options.find((opt) => {
      const optValue = typeof opt === "string" ? opt : opt.value;
      return optValue === value;
    });

    return found
      ? typeof found === "string"
        ? { value: found, label: found }
        : { ...found }
      : { value, label: value };
  });

  Handlebars.registerHelper("field", function (key, mode = "label", options) {
    const context = options?.data?.root || this;
    const fields = context._fields || [];
    const field = fields.find((f) => f.key === key);
    const value = context[key];

    if (!field) return `(unknown field: ${key})`;

    const isOptioned = ["dropdown", "radio", "multioption"].includes(
      field.type
    );
    if (!isOptioned) {
      const fn =
        typeof field.render === "function"
          ? field.render
          : defaultRenderers[field.type] || defaultRenderers.text;
      return fn(value, field);
    }

    const optionsList = field.options || [];
    const optMap = new Map(
      optionsList.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label ?? opt.value;
        return [val, label];
      })
    );

    if (field.type === "multioption" && Array.isArray(value)) {
      return value
        .map((val) => (mode === "value" ? val : optMap.get(val) || val))
        .join(", ");
    }

    return mode === "value" ? value : optMap.get(value) || value;
  });

  Handlebars.registerHelper("fieldRaw", function (key) {
    const value = this[key];
    return value;
  });

  Handlebars.registerHelper("fieldMeta", function (key, prop, options) {
    const context = options?.data?.root || this;
    const fields = context._fields || [];
    const field = fields.find((f) => f.key === key);
    if (!field) return undefined;
    return prop ? field[prop] : field;
  });
}

function renderMarkdown(formData, templateYaml) {
  if (!templateYaml.markdown_template) {
    return "# No template defined.";
  }

  try {
    registerHelpers();

    const context = {
      ...formData,
      _fields: templateYaml.fields || [],
    };

    const tmpl = Handlebars.compile(templateYaml.markdown_template);
    const output = tmpl(context);

    return output;
  } catch (err) {
    error("[Renderer] Failed to render markdown:", err);
    return `<!-- render error: ${err.message} -->`;
  }
}

module.exports = { renderMarkdown };
