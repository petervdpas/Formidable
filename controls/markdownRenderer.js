// controls/markdownRenderer.js

const Handlebars = require("handlebars");
const configManager = require("./configManager");
const { resolvePath } = require("./fileManager");
const { log, error } = require("./nodeLogger");

const defaultRenderers = {
  list: (value) => (value || []).map((v) => `- ${v}`).join("\n"),
  table: (value = []) =>
    value.map((row) => `| ${row.join(" | ")} |`).join("\n"),
  boolean: (v, field) => {
    const value = Boolean(v); // force to real boolean

    // If custom options are defined (e.g., ["on", "off"] or [{value, label}])
    if (Array.isArray(field.options) && field.options.length >= 2) {
      const [first, second] = field.options;

      const label1 =
        typeof first === "string" ? first : first.label || first.value;
      const label2 =
        typeof second === "string" ? second : second.label || second.value;

      return value ? label1 : label2;
    }

    // Fallback default
    return value ? "True" : "False";
  },
  text: (v) => v || "",
  number: (v) => `${v}`,
  range: (v) => `${v}`,
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
  image: (filename, field, template, filePrefix = true) => {
    if (!filename || typeof filename !== "string") return "";
    const basePath =
      configManager.getTemplateStoragePath(template?.filename) || "";
    const absPath = resolvePath(basePath, "images", filename);
    const normalized = absPath.replace(/\\/g, "/");
    return filePrefix ? `file://${normalized}` : normalized;
  },
};

function buildNestedLoopGroups(fields) {
  const groups = {};
  const stack = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (field.type === "loopstart") {
      stack.push({ key: field.key, fields: [] });
    } else if (field.type === "loopstop") {
      const completed = stack.pop();
      if (completed) {
        groups[completed.key] = completed.fields;
      }
    } else if (stack.length > 0) {
      stack[stack.length - 1].fields.push(field);
    }
  }

  return groups;
}

function registerHelpers(filePrefix = true) {
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
    let fn = defaultRenderers.text;

    if (typeof field.render === "function") {
      fn = field.render;
    } else if (field.type in defaultRenderers) {
      fn = defaultRenderers[field.type];
    }

    const rendered =
      field.type === "image"
        ? defaultRenderers.image(value, field, template, filePrefix)
        : fn(value, field, template);
    return typeof rendered === "string" ? rendered : `${rendered}`;
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
    const template = ctx._template;
    const allLoopGroups = ctx._loopGroups;

    if (!Array.isArray(items)) return "";

    const groupFields = allLoopGroups?.[key] || [];

    // Add synthetic index field for the loop
    const syntheticField = {
      key: `${key}_index`,
      label: `${key} index`,
      type: "number",
      description: `Auto-generated index for loop "${key}"`,
    };

    const combinedFields = [...groupFields, syntheticField];

    return items
      .map((entry, index) => {
        const subContext = {
          ...entry,
          [`${key}_index`]: index + 1,
          _fields: combinedFields,
          _template: template,
          _loopGroups: allLoopGroups,
        };

        return options.fn(subContext, {
          data: {
            ...options.data,
            root: subContext,
          },
        });
      })
      .join("\n");
  });
}

function renderMarkdown(formData, templateYaml, filePrefix = true) {
  if (!templateYaml.markdown_template) {
    return "# No template defined.";
  }

  try {
    registerHelpers(filePrefix);
    const context = {
      ...formData,
      _fields: templateYaml.fields || [],
      _template: templateYaml,
    };

    context._loopGroups = buildNestedLoopGroups(context._fields);

    const tmpl = Handlebars.compile(templateYaml.markdown_template);
    const output = tmpl(context);

    return output;
  } catch (err) {
    error("[Renderer] Failed to render markdown:", err);
    return `<!-- render error: ${err.message} -->`;
  }
}

module.exports = { renderMarkdown };
