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
    return typeof cfg.templates_location === "string" && cfg.templates_location.trim()
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
    const sanitized = schema.sanitize(raw);
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

    const filePath = getTemplatePath(name);
    const saved = fileManager.saveFile(filePath, data, { format: "yaml" });

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

    const saved = fileManager.saveFile(getTemplatePath(basicYamlName), content, {
      format: "yaml",
      silent: false,
    });

    if (saved) {
      log("[TemplateManager] Created basic.yaml at:", getTemplatePath(basicYamlName));
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
  getTemplateDescriptor,
  createBasicTemplateIfMissing,
};
