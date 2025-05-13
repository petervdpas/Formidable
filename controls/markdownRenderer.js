// controls/markdownRenderer.js

const Handlebars = require("handlebars");
const { log, error } = require("./nodeLogger");

// Fallbacks voor types
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

// Registreer helper die velddata ophaalt en rendert
function registerHelpers(fields) {
  Handlebars.registerHelper("field", function (key) {
    const field = fields.find((f) => f.key === key);
    if (!field) return `(unknown field: ${key})`;

    const value = this[key];
    const fn =
      typeof field.render === "function"
        ? field.render
        : defaultRenderers[field.type] || defaultRenderers.text;

    return fn(value, field);
  });
}

// Hoofdexport: render een formulier obv YAML + data
function renderMarkdown(formData, templateYaml) {
  if (!templateYaml.markdown_template) {
    return "# No template defined.";
  }

  try {
    const context = { ...formData };
    registerHelpers(templateYaml.fields || []);
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
