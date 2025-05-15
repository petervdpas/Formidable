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
  dropdown: (v) => v,
  radio: (v) => v,
  textarea: (v) => v,
};

function registerHelpers() {
  Handlebars.registerHelper("field", function (key) {
    const fields = this._fields || [];
    const field = fields.find((f) => f.key === key);
    const value = this[key];

    if (!field) {
      return `(unknown field: ${key})`;
    }

    const fn =
      typeof field.render === "function"
        ? field.render
        : defaultRenderers[field.type] || defaultRenderers.text;

    const rendered = fn(value, field);
    return rendered;
  });

  Handlebars.registerHelper("fieldRaw", function (key) {
    const value = this[key];
    return value;
  });

  Handlebars.registerHelper("fieldMeta", function (key, prop) {
    const fields = this._fields || [];
    const field = fields.find((f) => f.key === key);

    if (!field) {
      return undefined;
    }

    const result = prop ? field[prop] : field;
    return result;
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

    log("[Renderer] Rendered markdown template successfully.");
    return output;
  } catch (err) {
    error("[Renderer] Failed to render markdown:", err);
    return `<!-- render error: ${err.message} -->`;
  }
}

module.exports = { renderMarkdown };
