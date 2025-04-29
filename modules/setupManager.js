// modules/setupManager.js

const fs = require("fs"); 
const path = require("path");
const fileManager = require("./fileManager");
const { log, error } = require("./nodeLogger");

const setupDir = path.join(fileManager.baseDir, "setup");
const basicYamlName = "basic.yaml";
const basicYamlPath = path.join(setupDir, basicYamlName);

// Ensure setup folder and basic.yaml exist
function ensureSetupEnvironment() {
  fileManager.ensureDirectory(setupDir, { silent: true });

  if (!fs.existsSync(basicYamlPath)) {
    const content = {
      name: "Basic Form",
      markdown_dir: "./markdowns/basic",
      fields: [
        { key: "title", type: "text", label: "Title", default: "" },
        { key: "published", type: "boolean", label: "Published", default: false },
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
      log("[SetupManager] Created basic.yaml at:", basicYamlPath);
    } else {
      error("[SetupManager] Failed to create basic.yaml");
    }
  } else {
    log("[SetupManager] basic.yaml already exists.");
  }
}

// List all YAML setup files
function getTemplateList() {
  ensureSetupEnvironment();
  return fileManager.listFilesByExtension(setupDir, ".yaml");
}

// Load a setup YAML by name
function loadTemplateFile(name) {
  const filePath = path.join(setupDir, name);
  return fileManager.loadFile(filePath, { format: "yaml" });
}

module.exports = {
  ensureSetupEnvironment,
  getTemplateList,
  loadTemplateFile,
};
