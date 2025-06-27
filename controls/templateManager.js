// controls/templateManager.js

const fileManager = require("./fileManager");
const configManager = require("./configManager");
const schema = require("../schemas/template.schema");
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
    return schema.sanitize(raw, name);
  } catch (err) {
    error("[TemplateManager] Failed to load:", filePath, err);
    return null;
  }
}

function saveTemplate(name, data) {
  try {
    if (!data.filename) data.filename = name;

    const ordered = {
      name: data.name || "",
      filename: data.filename,
      markdown_template: data.markdown_template || "",
      sidebar_handling: data.sidebar_handling || "",
      enable_collection: data.enable_collection === true,
      fields: Array.isArray(data.fields) ? data.fields : [],
    };

    // Add extra custom keys if any
    for (const key of Object.keys(data)) {
      if (
        ![
          "name",
          "filename",
          "markdown_template",
          "sidebar_handling",
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

// Check for multiple primary keys (now supports nested constructs)
function checkPrimaryKey(fields) {
  const allFields = collectAllFields(fields);
  const pkFields = allFields.filter((f) => f.primary_key);
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

// Helper: recursively flatten all fields (including inside constructs)
function collectAllFields(fields, result = []) {
  for (const f of fields) {
    result.push(f);
    if (f.type === "construct" && Array.isArray(f.fields)) {
      collectAllFields(f.fields, result);
    }
  }
  return result;
}

// Check for duplicate keys (now supports nested constructs)
function checkDuplicateKeys(fields) {
  const allFields = collectAllFields(fields);
  const seen = new Map();
  const duplicates = [];

  for (const { key, type } of allFields) {
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

function checkLoopPairing(fields, context = [], inConstruct = false) {
  const errors = [];

  function validate(fields, nestingLevel, context, inConstruct) {
    const stack = [];

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const currentPath = [...context, field.key || `#${i}`];

      if (field.type === "construct" && Array.isArray(field.fields)) {
        validate(field.fields, 0, currentPath, true); // Reset depth inside construct
        continue;
      }

      if (field.type === "loopstart") {
        if (nestingLevel >= 1) {
          errors.push({
            type: "nested-loop-not-allowed",
            field,
            path: currentPath,
            message: `Nested loopstart '${field.key}' not allowed. Max loop depth = 1.`,
          });
        }
        stack.push({ field, path: currentPath });
        nestingLevel++;
      } else if (field.type === "loopstop") {
        if (stack.length === 0) {
          errors.push({
            type: "unmatched-loopstop",
            field,
            path: currentPath,
            message: `Unmatched loopstop '${field.key}' without preceding loopstart.`,
          });
        } else {
          const start = stack.pop();
          nestingLevel--;

          if (start.field.key !== field.key) {
            errors.push({
              type: "loop-key-mismatch",
              field,
              path: currentPath,
              expectedKey: start.field.key,
              message: `Loopstop key '${field.key}' does not match loopstart key '${start.field.key}'`,
            });
          }
        }
      }
    }

    while (stack.length > 0) {
      const { field, path: p } = stack.pop();
      errors.push({
        type: "unmatched-loopstart",
        field,
        path: p,
        message: `Unmatched loopstart '${field.key}' without corresponding loopstop.`,
      });
    }
  }

  validate(fields, 0, context, inConstruct);
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

  const collectionError = checkCollectionEnableValid(template);

  if (collectionError) {
    errors.push(collectionError);
  }

  return errors;
}

function createBasicTemplateIfMissing() {
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

module.exports = {
  ensureTemplateDirectory,
  listTemplates,
  loadTemplate,
  saveTemplate,
  deleteTemplate,
  validateTemplate,
  getTemplateDescriptor,
  createBasicTemplateIfMissing,
};
