// modules/fileManager.js

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { log, warn, error } = require("./nodeLogger");

// Base directory (root of project)
const baseDir = __dirname.includes("modules")
  ? path.resolve(__dirname, "..")
  : __dirname;

// Ensure a directory exists (creates if missing)
function ensureDirectory(dirPath, { silent = false } = {}) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      if (!silent) log(`[FileManager] Created directory: ${dirPath}`);
    } else {
      if (!silent) log(`[FileManager] Directory already exists: ${dirPath}`);
    }
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to ensure directory ${dirPath}:`, err);
    throw err;
  }
}

// Build a file path safely, with optional enforced extension
function buildFilePath(directory, baseFilename, { extension = "" } = {}) {
  const ext = extension ? (extension.startsWith(".") ? extension : `.${extension}`) : "";
  return path.join(directory, baseFilename + ext);
}

// List files by extension
function listFilesByExtension(directory, extension, { silent = false } = {}) {
  try {
    const files = fs.readdirSync(directory)
      .filter(f => f.endsWith(extension));
    if (!silent) log(`[FileManager] Found ${files.length} "${extension}" files in ${directory}`);
    return files;
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to list files in ${directory}:`, err);
    return [];
  }
}

// Generic file loader: format = "text" | "json" | "yaml"
function loadFile(filepath, { format = "text", silent = false } = {}) {
  if (!fs.existsSync(filepath)) {
    if (!silent) error(`[FileManager] File not found: ${filepath}`);
    throw new Error(`File not found: ${filepath}`);
  }

  try {
    let content = fs.readFileSync(filepath, "utf-8");
    if (format === "json") content = JSON.parse(content);
    else if (format === "yaml") content = yaml.load(content);

    if (!silent) log(`[FileManager] Loaded ${format} file: ${filepath}`);
    return content;
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to load ${format} file ${filepath}:`, err);
    throw err;
  }
}

// Generic file saver: format = "text" | "json" | "yaml"
function saveFile(filepath, data, { format = "text", silent = false } = {}) {
  try {
    let content = data;
    if (format === "json") content = JSON.stringify(data, null, 2);
    else if (format === "yaml") content = yaml.dump(data);

    fs.writeFileSync(filepath, content, "utf-8");

    if (!silent) log(`[FileManager] Saved ${format} file: ${filepath}`);
    return true;
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to save ${format} file ${filepath}:`, err);
    return false;
  }
}

module.exports = {
  baseDir,
  ensureDirectory,
  buildFilePath,
  listFilesByExtension,
  loadFile,
  saveFile,
};
