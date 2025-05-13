// controls/templateManager.js

const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");
const schema = require("../schemas/template.schema");

const templatesDir = fileManager.joinPath("templates");
const basicYamlName = "basic.yaml";
const basicYamlPath = fileManager.joinPath("templates", basicYamlName);

function ensureTemplateDirectory() {
  try {
    const fullPath = fileManager.resolvePath(templatesDir);
    fileManager.ensureDirectory(fullPath, { silent: true });
    log("[TemplateManager] Ensured template directory:", fullPath);
    return true;
  } catch (err) {
    error("[TemplateManager] Failed to ensure template directory:", err);
    return false;
  }
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
    if (typeof data.markdown_dir === "string") {
      data.markdown_dir = data.markdown_dir.replace(/\\/g, "/");
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
    markdownDir: data.markdown_dir,
  };
}

function createBasicTemplateIfMissing() {
  if (!fileManager.fileExists(basicYamlPath)) {
    const content = {
      name: "Basic Form",
      markdown_dir: "./markdowns/basic",
      markdown_template: `# {{field "title"}}

{{field "published"}}

Category: **{{field "category"}}**`,
      fields: [
        {
          key: "title",
          label: "Title",
          type: "text",
          default: "Hello World",
          description: "Please put in the title here...",
          two_column: true,
        },
        {
          key: "published",
          label: "Published",
          type: "boolean",
          description: "Is it published? Tick the box for 'Yes'",
          markdown: "checkbox",
          two_column: true,
        },
        {
          key: "category",
          label: "Category",
          type: "dropdown",
          default: "Blog",
          description: "Select the proper category.",
          markdown: "p",
          two_column: true,
          options: ["News", "Updates", "Blog", "Tutorial"],
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
