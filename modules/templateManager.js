// modules/templateManager.js

const fileManager = require("./fileManager");
const { log, error } = require("./nodeLogger");

const setupDir = fileManager.joinPath("setup");
const basicYamlName = "basic.yaml";
const basicYamlPath = fileManager.joinPath("setup", basicYamlName);

function ensureSetupEnvironment() {
  fileManager.ensureDirectory(setupDir, { silent: true });

  if (!fileManager.fileExists(basicYamlPath)) {
    const content = {
      name: "Basic Form",
      markdown_dir: "./markdowns/basic",
      fields: [
        { key: "title", type: "text", label: "Title", default: "" },
        {
          key: "published",
          type: "boolean",
          label: "Published",
          default: false,
        },
        {
          key: "category",
          type: "dropdown",
          label: "Category",
          options: ["News", "Tutorial", "Opinion"],
          default: "News",
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

function getTemplateList() {
  ensureSetupEnvironment();
  return fileManager.listFilesByExtension(setupDir, ".yaml");
}

function loadTemplateFile(name) {
  const filePath = fileManager.joinPath("setup", name);
  const data = fileManager.loadFile(filePath, { format: "yaml" });

  if (data.markdown_dir && typeof data.markdown_dir === "string") {
    data.markdown_dir = fileManager.joinPath(data.markdown_dir);
  }

  return data;
}

module.exports = {
  ensureSetupEnvironment,
  getTemplateList,
  loadTemplateFile,
};
