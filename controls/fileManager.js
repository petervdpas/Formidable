// controls/fileManager.js

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { log, warn, error } = require("./nodeLogger");

let appRoot = null;

// Fallback base directory (used only if app root isn't set)
const baseDir = __dirname.includes("controls")
  ? path.resolve(__dirname, "..")
  : __dirname;

function setAppRoot(dir) {
  appRoot = dir;
}

function getAppRoot() {
  return appRoot || baseDir;
}

function isAbsolute(p) {
  return path.isAbsolute(p);
}

// Ensure a directory exists (creates if missing)
function ensureDirectory(dirPath, { label = null, silent = false, throwOnError = false } = {}) {
  try {
    const fullPath = resolvePath(dirPath);
    const exists = fs.existsSync(fullPath);

    if (!exists) {
      fs.mkdirSync(fullPath, { recursive: true });
      if (!silent) {
        log(`${label ? `[${label}]` : "[FileManager]"} Created directory: ${fullPath}`);
      }
    } else {
      if (!silent) {
        log(`${label ? `[${label}]` : "[FileManager]"} Directory already exists: ${fullPath}`);
      }
    }

    return true;
  } catch (err) {
    if (!silent) {
      error(`${label ? `[${label}]` : "[FileManager]"} Failed to ensure directory ${dirPath}:`, err);
    }
    if (throwOnError) throw err;
    return false;
  }
}

// Build a file path safely, with optional enforced extension
function buildFilePath(directory, baseFilename, { extension = "" } = {}) {
  const ext = extension
    ? extension.startsWith(".")
      ? extension
      : `.${extension}`
    : "";
  return path.join(directory, baseFilename + ext);
}

// Join + normalize path relative to app root
function joinPath(...segments) {
  const flattened = segments.flatMap((s) =>
    typeof s === "string" ? s.split(/[/\\]/).filter(Boolean) : []
  );

  const first = segments[0];
  if (typeof first === "string" && path.isAbsolute(first)) {
    return path.join(...flattened);
  }

  return path.join(getAppRoot(), ...flattened);
}

// Resolve a path relative to app root
function resolvePath(...segments) {
  const flat = path.join(...segments);
  return path.isAbsolute(flat) ? flat : path.resolve(getAppRoot(), flat);
}

// List files by extension
function listFilesByExtension(directory, extension, { silent = false } = {}) {
  try {
    const files = fs
      .readdirSync(directory)
      .filter((f) => f.endsWith(extension));
    if (!silent)
      log(
        `[FileManager] Found ${files.length} "${extension}" files in ${directory}`
      );
    return files;
  } catch (err) {
    if (!silent)
      error(`[FileManager] Failed to list files in ${directory}:`, err);
    return [];
  }
}

// Check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
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
    if (!silent)
      error(`[FileManager] Failed to load ${format} file ${filepath}:`, err);
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
    if (!silent)
      error(`[FileManager] Failed to save ${format} file ${filepath}:`, err);
    return false;
  }
}

function saveImageFile(storageLocation, filename, buffer, { silent = false } = {}) {
  try {
    const imageDir = resolvePath(storageLocation, "images");
    ensureDirectory(imageDir, { silent });
    const targetPath = path.join(imageDir, filename);

    fs.writeFileSync(targetPath, Buffer.from(buffer));
    if (!silent) log(`[FileManager] Saved image to: ${targetPath}`);

    return { success: true, path: targetPath };
  } catch (err) {
    if (!silent) error("[FileManager] Failed to save image file:", err);
    return { success: false, error: err.message };
  }
}

// Delete a file if it exists
function deleteFile(filepath, { silent = false } = {}) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      if (!silent) log(`[FileManager] Deleted file: ${filepath}`);
      return true;
    } else {
      if (!silent) warn(`[FileManager] File not found for deletion: ${filepath}`);
      return false;
    }
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to delete file ${filepath}:`, err);
    return false;
  }
}

module.exports = {
  baseDir,
  setAppRoot,
  getAppRoot,
  ensureDirectory,
  buildFilePath,
  resolvePath,
  joinPath,
  listFilesByExtension,
  fileExists,
  loadFile,
  saveFile,
  saveImageFile,
  deleteFile,
};
