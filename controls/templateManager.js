// controls/templateManager.js

const fileManager = require("./fileManager");
const configManager = require("./configManager");
const schemaTemplate = require("../schemas/template.schema");
const schemaField = require("../schemas/field.schema");
const { log, warn, error } = require("./nodeLogger");

const basicYamlName = "basic.yaml";

function getTemplatesDir() {
  return configManager.getContextTemplatesPath();
}

function getTemplatePath(name = "") {
  return fileManager.joinPath(getTemplatesDir(), name);
}

function ensureTemplateDirectory() {
  return fileManager.ensureDirectory(getTemplatesDir(), {
    label: "TemplateManager",
    silent: true,
  });
}

function listTemplates() {
  return fileManager.listFilesByExtension(getTemplatesDir(), ".yaml");
}

function loadTemplate(name) {
  const filePath = getTemplatePath(name);
  try {
    const raw = fileManager.loadFile(filePath, { format: "yaml" });
    return schemaTemplate.sanitize(raw, name);
  } catch (err) {
    error("[TemplateManager] Failed to load:", filePath, err);
    return null;
  }
}

function saveTemplate(name, data) {
  try {
    if (!data.filename) data.filename = name;

    const sanitizedFields = Array.isArray(data.fields)
      ? data.fields.map((f) => {
          const clean = schemaField.sanitize(f);
          if (clean.type !== "loopstart") {
            delete clean.summary_field;
          }
          return clean;
        })
      : [];

    const ordered = {
      name: data.name || "",
      filename: data.filename,
      item_field: data.item_field || "",
      markdown_template: data.markdown_template || "",
      sidebar_expression: data.sidebar_expression || "",
      enable_collection: data.enable_collection === true,
      fields: sanitizedFields,
    };

    // Add extra custom keys if any
    for (const key of Object.keys(data)) {
      if (
        ![
          "name",
          "filename",
          "item_field",
          "markdown_template",
          "sidebar_expression",
          "enable_collection",
          "fields",
        ].includes(key)
      ) {
        ordered[key] = data[key];
      }
    }

    const filePath = getTemplatePath(name);
    const saved = fileManager.saveFile(filePath, ordered, { format: "yaml" });

    if (saved) {
      log("[TemplateManager] Saved template:", filePath);
      return true;
    } else {
      error("[TemplateManager] Failed to save template:", filePath);
      return false;
    }
  } catch (err) {
    error("[TemplateManager] Exception while saving template:", err);
    return false;
  }
}

function deleteTemplate(name) {
  const filePath = getTemplatePath(name);
  try {
    const deleted = fileManager.deleteFile(filePath);
    if (deleted) {
      log("[TemplateManager] Deleted template:", filePath);
      return true;
    } else {
      warn("[TemplateManager] File not found or not deleted:", filePath);
      return false;
    }
  } catch (err) {
    error("[TemplateManager] Failed to delete template:", err);
    return false;
  }
}

function getTemplateDescriptor(name) {
  const data = loadTemplate(name);
  if (!data) {
    throw new Error(`Template descriptor missing or malformed for: ${name}`);
  }

  return {
    name,
    yaml: data,
    storageLocation: configManager.getTemplateStoragePath(name),
  };
}

function checkPrimaryKey(fields) {
  const pkFields = fields.filter((f) => f.primary_key);
  if (pkFields.length > 1) {
    return {
      type: "multiple-primary-keys",
      keys: pkFields.map((f) => f.key),
      message: `Multiple primary keys found: ${pkFields
        .map((f) => f.key)
        .join(", ")}`,
    };
  }
  return null;
}

function checkDuplicateKeys(fields) {
  const seen = new Map();
  const duplicates = [];

  for (const { key, type } of fields) {
    if (!key) continue;
    if (seen.has(key)) {
      const existingType = seen.get(key);
      const isLoopPair =
        (type === "loopstart" && existingType === "loopstop") ||
        (type === "loopstop" && existingType === "loopstart");
      if (!isLoopPair) duplicates.push(key);
    } else {
      seen.set(key, type);
    }
  }

  return duplicates;
}

function checkLoopPairing(fields) {
  const errors = [];
  const stack = [];

  fields.forEach((field, index) => {
    if (field.type === "loopstart") {
      stack.push({ field, index });
    } else if (field.type === "loopstop") {
      if (stack.length === 0) {
        errors.push({
          type: "unmatched-loopstop",
          field,
          index,
          message: "Unmatched loopstop without preceding loopstart",
        });
      } else {
        const start = stack.pop();
        if (field.key !== start.field.key) {
          errors.push({
            type: "loop-key-mismatch",
            field,
            index,
            expectedKey: start.field.key,
            actualKey: field.key,
            message: `Loopstop key '${field.key}' does not match loopstart key '${start.field.key}'`,
          });
        }
      }
    }
  });

  while (stack.length > 0) {
    const { field, index } = stack.pop();
    errors.push({
      type: "unmatched-loopstart",
      field,
      index,
      message: "Unmatched loopstart without corresponding loopstop",
    });
  }

  return errors;
}

function checkCollectionEnableValid(template) {
  if (template.enable_collection !== true) return null;

  const hasGuid = template.fields.some((f) => f.type === "guid");
  if (!hasGuid) {
    return {
      type: "missing-guid-for-collection",
      message:
        "`Enable Collection` is active but no GUID field found. Add a GUID field or disable this option.",
    };
  }

  return null;
}

function checkLoopNestingDepth(fields, maxDepth = 2) {
  const errors = [];
  const stack = [];

  for (const field of fields) {
    if (field.type === "loopstart") {
      stack.push(field.key);
      if (stack.length > maxDepth) {
        errors.push({
          type: "excessive-loop-nesting",
          key: field.key,
          depth: stack.length,
          maxDepth,
          path: stack.join(" → "),
        });
      }
    } else if (field.type === "loopstop") {
      if (stack[stack.length - 1] === field.key) {
        stack.pop();
      } else {
        // Let checkLoopPairing handle mismatches
      }
    }
  }

  return errors;
}

function checkSingleTagsField(fields) {
  const tagKeys = fields
    .filter((f) => f?.type === "tags")
    .map((f) => f.key || "(no key)");
  if (tagKeys.length > 1) {
    return {
      type: "multiple-tags-fields",
      keys: tagKeys,
      message: `Only one 'tags' field is allowed per template (found: ${tagKeys.join(
        ", "
      )})`,
    };
  }
  return null;
}

function getTagsFieldKey(fields) {
  const f = fields.find((x) => x?.type === "tags");
  return f ? f.key : null;
}

function validateTemplate(template) {
  if (!template || !Array.isArray(template.fields)) {
    return [
      { type: "invalid-template", message: "Missing or invalid fields array" },
    ];
  }

  const errors = [];

  const duplicates = checkDuplicateKeys(template.fields);
  if (duplicates.length > 0) {
    errors.push({ type: "duplicate-keys", keys: duplicates });
  }

  const pkError = checkPrimaryKey(template.fields);
  if (pkError) {
    errors.push(pkError);
  }

  errors.push(...checkLoopPairing(template.fields));
  errors.push(...checkLoopNestingDepth(template.fields, 2)); // LOOPLEVEL 1 only

  const collectionError = checkCollectionEnableValid(template);

  if (collectionError) {
    errors.push(collectionError);
  }

  const tagsError = checkSingleTagsField(template.fields);
  if (tagsError) {
    errors.push(tagsError);
  }

  return errors;
}

function seedBasicTemplateIfEmpty() {
  ensureTemplateDirectory();

  const existing = listTemplates();
  if ((existing?.length || 0) > 0) {
    // Nothing to seed; do NOT require or create basic.yaml
    return;
  }

  const path = getTemplatePath(basicYamlName);

  if (!fileManager.fileExists(path)) {
    const content = {
      name: "Basic Form",
      filename: basicYamlName,
      markdown_template: ``,
      fields: [
        {
          key: "test",
          label: "Test",
          type: "text",
          default: "Default value",
          two_column: true,
        },
        { key: "check", label: "Check", type: "boolean", two_column: true },
        {
          key: "dropdown",
          label: "Dropdown",
          type: "dropdown",
          default: "R",
          two_column: true,
          options: [
            { value: "L", label: "Left" },
            { value: "R", label: "Right" },
          ],
        },
        {
          key: "multichoice",
          label: "Multiple Choice",
          type: "multioption",
          two_column: true,
          options: [
            { value: "A", label: "Option A" },
            { value: "B", label: "Option B" },
            { value: "C", label: "Option C" },
          ],
        },
        {
          key: "radio",
          label: "Radio",
          type: "radio",
          default: "DOG",
          two_column: true,
          options: [
            { value: "CAT", label: "Cat" },
            { value: "DOG", label: "Dog" },
            { value: "BIRD", label: "Bird" },
          ],
        },
        {
          key: "mline",
          label: "Mline",
          type: "textarea",
          default: "A whole lot of prefab text...",
        },
        {
          key: "numpy",
          label: "Numpy",
          type: "number",
          default: "17",
        },
        {
          key: "bday",
          label: "Birthday",
          type: "date",
          default: "1968-12-23",
        },
        {
          key: "listy",
          label: "Listy",
          type: "list",
        },
        {
          key: "datable",
          label: "Table",
          type: "table",
          options: [
            { value: "col1", label: "Column 1" },
            { value: "col2", label: "Column 2" },
            { value: "col3", label: "Column 3" },
          ],
        },
      ],
    };

    const saved = fileManager.saveFile(path, content, {
      format: "yaml",
      silent: false,
    });

    if (saved) {
      log("[TemplateManager] Created basic.yaml at:", path);
    } else {
      error("[TemplateManager] Failed to create basic.yaml");
    }
  } else {
    log("[TemplateManager] basic.yaml already exists.");
  }
}

function computeTopLevelTextFields(fields = []) {
  const opts = [];
  const stack = []; // loop nesting depth

  for (const f of fields) {
    if (!f || !f.type) continue;

    if (f.type === "loopstart") {
      stack.push(f.key);
      continue;
    }
    if (f.type === "loopstop") {
      if (stack[stack.length - 1] === f.key) stack.pop();
      continue;
    }

    if (stack.length === 0 && f.type === "text" && f.key) {
      opts.push({ key: f.key, label: f.label || f.key });
    }
  }
  return opts;
}

function getPossibleItemFields(name) {
  const data = loadTemplate(name);
  return data.fields ? computeTopLevelTextFields(data.fields) : [];
}

module.exports = {
  ensureTemplateDirectory,
  listTemplates,
  loadTemplate,
  saveTemplate,
  deleteTemplate,
  validateTemplate,
  getTemplateDescriptor,
  seedBasicTemplateIfEmpty,
  getPossibleItemFields,
  getTagsFieldKey,
};
