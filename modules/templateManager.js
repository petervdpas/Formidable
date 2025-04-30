// modules/templateManager.js

const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");

const templatesDir = fileManager.joinPath("templates");
const basicYamlName = "basic.yaml";
const basicYamlPath = fileManager.joinPath("templates", basicYamlName);

function ensureTemplatesEnvironment() {
  fileManager.ensureDirectory(templatesDir, { silent: true });

  if (!fileManager.fileExists(basicYamlPath)) {
    const content = {
      name: "Basic Form",
      markdown_dir: "./markdowns/basic",
      fields: [
        { key: "title", type: "text", label: "Title", markdown: "h1" },
        {
          key: "published",
          type: "boolean",
          label: "Published",
          markdown: "checkbox",
        },
        {
          key: "category",
          type: "dropdown",
          label: "Category",
          options: ["News", "Updates", "Blog", "Tutorial"],
          markdown: "p",
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

function getTemplateDescriptor(name) {
  ensureTemplatesEnvironment();
  const data = loadTemplateFile(name);

  if (!data) {
    throw new Error(`Template "${name}" not found.`);
  }

  return {
    name,
    yaml: data,
    markdownDir: data.markdown_dir,
  };
}

function getTemplateList() {
  ensureTemplatesEnvironment();
  return fileManager.listFilesByExtension(templatesDir, ".yaml");
}

function loadTemplateFile(name) {
  const filePath = fileManager.joinPath("templates", name);
  const data = fileManager.loadFile(filePath, { format: "yaml" });

  if (data.markdown_dir && typeof data.markdown_dir === "string") {
    data.markdown_dir = fileManager.joinPath(data.markdown_dir);
  }

  return data;
}

function loadTemplateForDir(markdownDir) {
  const files = fileManager.listFilesByExtension(templatesDir, ".yaml");

  for (const filename of files) {
    const fullPath = fileManager.joinPath(templatesDir, filename);
    const data = fileManager.loadFile(fullPath, { format: "yaml" });

    const resolvedDir = fileManager.resolvePath(data.markdown_dir || "");
    const targetDir = fileManager.resolvePath(markdownDir);

    if (resolvedDir === targetDir) {
      log("[TemplateManager] Found template for dir:", targetDir);
      return data;
    }
  }

  warn("[TemplateManager] No template found for dir:", markdownDir);
  return null;
}

function saveTemplateFile(name, data) {
  try {
    ensureTemplatesEnvironment();
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

function deleteTemplateFile(name) {
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

module.exports = {
  ensureTemplatesEnvironment,
  getTemplateDescriptor,
  getTemplateList,
  loadTemplateForDir,
  loadTemplateFile,
  saveTemplateFile,
  deleteTemplateFile,
};