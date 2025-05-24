// controls/templateManager.js

const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");
const schema = require("../schemas/template.schema");

const templatesDir = fileManager.joinPath("templates");
const basicYamlName = "basic.yaml";
const basicYamlPath = fileManager.joinPath("templates", basicYamlName);

function ensureTemplateDirectory() {
  const fullPath = fileManager.resolvePath(templatesDir);
  return fileManager.ensureDirectory(fullPath, {
    label: "TemplateManager",
    silent: true,
  });
}

function listTemplates() {
  return fileManager.listFilesByExtension(templatesDir, ".yaml");
}

function loadTemplate(name) {
  const filePath = fileManager.joinPath("templates", name);
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

    const filePath = fileManager.joinPath("templates", name);
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
    const filePath = fileManager.joinPath("templates", name);
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
  if (!fileManager.fileExists(basicYamlPath)) {
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
          description: "A test description",
          two_column: true,
        },
        {
          key: "check",
          label: "Check",
          type: "boolean",
          description: "A test description - two-column",
          two_column: true,
        },
        {
          key: "dropdown",
          label: "Dropdown",
          type: "dropdown",
          default: "Right",
          description: "A test description - two-column",
          two_column: true,
          options: ["Left", "Right"],
        },
        {
          key: "multichoice",
          label: "Multiple Choice",
          type: "multioption",
          description: "A test description - single-column... jk...",
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
          default: "Dog",
          description: "A test description - two-column",
          two_column: true,
          options: ["Cat", "Dog", "Bird"],
        },
        {
          key: "mline",
          label: "Mline",
          type: "textarea",
          default: "A whole lot of prefab text...",
          description: "A test description - single-column",
        },
        {
          key: "numpy",
          label: "Numpy",
          type: "number",
          default: "17",
          description: "A test description - single-column",
        },
        {
          key: "bday",
          label: "Birthday",
          type: "date",
          default: "1968-12-23",
          description: "A test description - single-column",
        },
        {
          key: "listy",
          label: "Listy",
          type: "list",
          description: "A test description - single-column",
        },
        {
          key: "datable",
          label: "Table",
          type: "table",
          description: "A test description - single-column",
          options: ["Header1", "Header2", "Header3"],
        },
      ],
    };

    const saved = fileManager.saveFile(basicYamlPath, content, {
      format: "yaml",
      silent: false,
    });

    if (saved) {
      log("[TemplateManager] Created basic.yaml at:", basicYamlPath);
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
