// controls/markdownRenderer.js

const Handlebars = require("handlebars");
const configManager = require("./configManager");
const { resolvePath } = require("./fileManager");
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
  image: (filename, field, template) => {
    if (!filename || typeof filename !== "string") return "";
    const basePath = configManager.getTemplateStoragePath(template?.filename) || "";
    const absPath = resolvePath(basePath, "images", filename);
    const uri = `file://${absPath.replace(/\\/g, "/")}`; // normalize for Electron
    return uri;
  },
};

function buildLoopGroups(fields) {
  const groups = {};
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];
    if (field.type === "loopstart") {
      const loopKey = field.key;
      const group = [];
      i++;

      while (i < fields.length && fields[i].type !== "loopstop") {
        group.push(fields[i]);
        i++;
      }

      groups[loopKey] = group;
    }
    i++;
  }

  return groups;
}

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
    const template = context._template || {};
    const field = fields.find((f) => f.key === key);
    const value = context[key];

    // log(`[FieldHelper] key: ${key}, type: ${field?.type}, value: ${value}`);

    if (!field) return `(unknown field: ${key})`;

    // Handle multioption arrays with value/label distinction
    if (field.type === "multioption" && Array.isArray(value)) {
      const optMap = new Map(
        (field.options || []).map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label ?? opt.value;
          return [val, label];
        })
      );
      return value
        .map((val) => (mode === "value" ? val : optMap.get(val) || val))
        .join(", ");
    }

    // Handle dropdown, radio, table with simple value/label
    if (["dropdown", "radio", "table"].includes(field.type)) {
      const optMap = new Map(
        (field.options || []).map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label ?? opt.value;
          return [val, label];
        })
      );
      return mode === "value" ? value : optMap.get(value) || value;
    }

    // Use render function or default renderer
    const fn =
      typeof field.render === "function"
        ? field.render
        : defaultRenderers[field.type] || defaultRenderers.text;

    return fn(value, field, template); // ✅ now template is defined
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

  Handlebars.registerHelper("fieldDescription", function (key, options) {
    const context = options?.data?.root || this;
    const fields = context._fields || [];
    const field = fields.find((f) => f.key === key);
    return field?.description || "";
  });

  Handlebars.registerHelper("loop", function (key, options) {
    const ctx = options?.data?.root || this;
    const items = ctx[key];

    if (!Array.isArray(items)) return "";

    const loopGroups = buildLoopGroups(ctx._fields || []);
    const groupFields = loopGroups[key] || [];

    return items
      .map((entry) => {
        const subContext = {
          ...entry,
          _fields: groupFields,
          _template: ctx._template,
        };
        return options.fn(subContext);
      })
      .join("\n");
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
      _template: templateYaml,
    };

    context._loopGroups = buildLoopGroups(context._fields);
    
    const tmpl = Handlebars.compile(templateYaml.markdown_template);
    const output = tmpl(context);

    return output;
  } catch (err) {
    error("[Renderer] Failed to render markdown:", err);
    return `<!-- render error: ${err.message} -->`;
  }
}

module.exports = { renderMarkdown };
