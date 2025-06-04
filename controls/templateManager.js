// controls/templateManager.js

const fileManager = require("./fileManager");
const configManager = require("./configManager");
const { log, warn, error } = require("./nodeLogger");
const schema = require("../schemas/template.schema");

const basicYamlName = "basic.yaml";

let cachedConfig = null;

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = configManager.loadUserConfig();
  }
  return cachedConfig;
}

function getConfigTemplatesDir() {
  try {
    const cfg = getConfig(); // uses cache
    return typeof cfg.templates_location === "string" &&
      cfg.templates_location.trim()
      ? cfg.templates_location
      : "./templates";
  } catch {
    return "./templates";
  }
}

function getTemplatesDir() {
  return fileManager.joinPath(getConfigTemplatesDir());
}

function getTemplatePath(name = "") {
  return fileManager.joinPath(getConfigTemplatesDir(), name);
}

function ensureTemplateDirectory() {
  const fullPath = fileManager.resolvePath(getTemplatesDir());
  return fileManager.ensureDirectory(fullPath, {
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
    const sanitized = schema.sanitize(raw, name); // filename = bestandsnaam
    return sanitized;
  } catch (err) {
    error("[TemplateManager] Failed to load:", filePath, err);
    return null;
  }
}

function saveTemplate(name, data) {
  try {
    if (typeof data.storage_location === "string") {
      data.storage_location = data.storage_location.replace(/\\/g, "/");
    }

    // Voeg filename toe als die nog niet bestaat
    if (!data.filename) {
      data.filename = name;
    }

    // Bouw een nieuw object met keys in de juiste volgorde
    const ordered = {};

    // Zet name en filename eerst (in die volgorde)
    ordered.name = data.name || "";
    ordered.filename = data.filename;

    // Voeg de rest toe, behalve name en filename
    for (const key of Object.keys(data)) {
      if (key !== "name" && key !== "filename") {
        ordered[key] = data[key];
      }
    }

    const filePath = getTemplatePath(name);

    // Hier moet je fileManager.saveFile zo aanpassen dat het
    // de keys in deze volgorde serialiseert (of, je gebruikt een YAML-lib die dat kan)
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
  try {
    const filePath = getTemplatePath(name);
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
    storageLocation: data.storage_location,
  };
}

function checkDuplicateKeys(fields) {
  const seen = new Map(); // key → type
  const duplicates = [];

  for (const field of fields) {
    const { key, type } = field;
    if (!key) continue;

    if (seen.has(key)) {
      const existingType = seen.get(key);

      const isLoopPair =
        (type === "loopstart" && existingType === "loopstop") ||
        (type === "loopstop" && existingType === "loopstart");

      if (!isLoopPair) {
        duplicates.push(key);
      }
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

function validateTemplate(template) {
  const errors = [];

  if (!template || !Array.isArray(template.fields)) {
    return [
      { type: "invalid-template", message: "Missing or invalid fields array" },
    ];
  }

  const duplicates = checkDuplicateKeys(template.fields);
  if (duplicates.length > 0) {
    errors.push({
      type: "duplicate-keys",
      keys: duplicates,
    });
  }

  const loopErrors = checkLoopPairing(template.fields);
  errors.push(...loopErrors);

  return errors;
}

function createBasicTemplateIfMissing() {
  if (!fileManager.fileExists(getTemplatePath(basicYamlName))) {
    const content = {
      name: "Basic Form",
      storage_location: "./storage/basic",
      markdown_template: ``,
      fields: [
        {
          key: "test",
          label: "Test",
          type: "text",
          default: "Default value",
          description: "A basic text input for demonstration purposes.",
          two_column: true,
        },
        {
          key: "check",
          label: "Check",
          type: "boolean",
          description: "Enable or disable this feature using a checkbox.",
          two_column: true,
        },
        {
          key: "dropdown",
          label: "Dropdown",
          type: "dropdown",
          default: "R",
          description: "Select a single value from a dropdown menu.",
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
          description: "Choose one or more options from a list of checkboxes.",
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
          description: "Pick one option using radio buttons.",
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
          description: "Enter longer text, such as notes or paragraphs.",
        },
        {
          key: "numpy",
          label: "Numpy",
          type: "number",
          default: "17",
          description: "A numeric input field. Only accepts numbers.",
        },
        {
          key: "bday",
          label: "Birthday",
          type: "date",
          default: "1968-12-23",
          description: "Select a date from the calendar picker.",
        },
        {
          key: "listy",
          label: "Listy",
          type: "list",
          description: "Add multiple short entries in list format.",
        },
        {
          key: "datable",
          label: "Table",
          type: "table",
          description: "Enter rows of structured data using defined columns.",
          options: [
            { value: "col1", label: "Column 1" },
            { value: "col2", label: "Column 2" },
            { value: "col3", label: "Column 3" },
          ],
        },
      ],
    };

    const saved = fileManager.saveFile(
      getTemplatePath(basicYamlName),
      content,
      {
        format: "yaml",
        silent: false,
      }
    );

    if (saved) {
      log(
        "[TemplateManager] Created basic.yaml at:",
        getTemplatePath(basicYamlName)
      );
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
