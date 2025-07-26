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
function ensureDirectory(
  dirPath,
  { label = null, silent = false, throwOnError = false } = {}
) {
  try {
    const fullPath = resolvePath(dirPath);
    const exists = fs.existsSync(fullPath);

    if (!exists) {
      fs.mkdirSync(fullPath, { recursive: true });
      if (!silent) {
        log(
          `${
            label ? `[${label}]` : "[FileManager]"
          } Created directory: ${fullPath}`
        );
      }
    } else {
      if (!silent) {
        log(
          `${
            label ? `[${label}]` : "[FileManager]"
          } Directory already exists: ${fullPath}`
        );
      }
    }

    return true;
  } catch (err) {
    if (!silent) {
      error(
        `${
          label ? `[${label}]` : "[FileManager]"
        } Failed to ensure directory ${dirPath}:`,
        err
      );
    }
    if (throwOnError) throw err;
    return false;
  }
}

function copyFolderRecursive(
  from,
  to,
  overwrite = true,
  { silent = false } = {}
) {
  const src = resolvePath(from);
  const dest = resolvePath(to);

  try {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    ensureDirectory(dest, { silent });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyFolderRecursive(srcPath, destPath, overwrite, { silent });
      } else {
        if (!overwrite && fs.existsSync(destPath)) {
          if (!silent) {
            warn(`[FileManager] Skipped existing file: ${destPath}`);
          }
          continue;
        }

        fs.copyFileSync(srcPath, destPath);
      }
    }

    return true;
  } catch (err) {
    error(`[FileManager] Failed to copy folder ${src} to ${dest}:`, err);
    return false;
  }
}

function copyFile(from, to, { overwrite = true, silent = false } = {}) {
  try {
    const srcPath = resolvePath(from);
    const destPath = resolvePath(to);

    if (!overwrite && fs.existsSync(destPath)) {
      if (!silent) warn(`[FileManager] Skipped existing file: ${destPath}`);
      return { success: true, skipped: true };
    }

    ensureDirectory(path.dirname(destPath), { silent });
    fs.copyFileSync(srcPath, destPath);
    if (!silent) log(`[FileManager] Copied file: ${srcPath} → ${destPath}`);

    return { success: true };
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to copy file:`, err);
    return { success: false, error: err.message };
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
  if (!segments.length) return getAppRoot();

  const first = segments[0];

  // If the first segment is an absolute path, do a direct join (native)
  if (typeof first === "string" && path.isAbsolute(first)) {
    return path.join(...segments);
  }

  // Otherwise, join relative to app root
  return path.join(getAppRoot(), ...segments);
}

// Resolve a path relative to app root
function resolvePath(...segments) {
  const joined = path.join(...segments);
  return path.isAbsolute(joined)
    ? path.normalize(joined)
    : path.resolve(getAppRoot(), joined);
}

function makeRelative(basePath, targetPath) {
  return path.relative(basePath, targetPath);
}

function toPosixPath(p) {
  return p.replace(/\\/g, "/");
}

function listFolders(dir, { silent = false, filter = null } = {}) {
  try {
    let folders = fs
      .readdirSync(dir)
      .filter((f) => fs.statSync(path.join(dir, f)).isDirectory());

    if (typeof filter === "function") {
      folders = folders.filter(filter);
    }

    return folders;
  } catch (err) {
    if (!silent) error("[FileManager] Failed to list folders:", err);
    return [];
  }
}

function listFiles(dir, { silent = false, filter = null } = {}) {
  try {
    let files = fs
      .readdirSync(dir)
      .filter((f) => fs.statSync(path.join(dir, f)).isFile());

    if (typeof filter === "function") {
      files = files.filter(filter);
    }

    return files;
  } catch (err) {
    if (!silent) console.error("[FileManager] Failed to list files:", err);
    return [];
  }
}

// preserve API
function listFilesByExtension(dir, ext, opts = {}) {
  return listFiles(dir, {
    ...opts,
    filter: (f) => f.endsWith(ext),
  });
}

function listDirectoryEntries(dir, { silent = false } = {}) {
  try {
    const fs = require("fs");
    return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));
  } catch (err) {
    if (!silent) console.error(`[FileManager] Failed to read: ${dir}`, err);
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

function saveImageFile(
  storageLocation,
  filename,
  buffer,
  { silent = false } = {}
) {
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
      if (!silent)
        warn(`[FileManager] File not found for deletion: ${filepath}`);
      return false;
    }
  } catch (err) {
    if (!silent) error(`[FileManager] Failed to delete file ${filepath}:`, err);
    return false;
  }
}

function deleteFolder(dirPath, { silent = false } = {}) {
  try {
    const fullPath = resolvePath(dirPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      if (!silent) log(`[FileManager] Deleted folder: ${fullPath}`);
      return true;
    } else {
      if (!silent)
        warn(`[FileManager] Folder not found for deletion: ${fullPath}`);
      return false;
    }
  } catch (err) {
    if (!silent)
      error(`[FileManager] Failed to delete folder ${dirPath}:`, err);
    return false;
  }
}

module.exports = {
  baseDir,
  setAppRoot,
  getAppRoot,
  ensureDirectory,
  makeRelative,
  toPosixPath,
  copyFolderRecursive,
  copyFile,
  buildFilePath,
  resolvePath,
  joinPath,
  listFolders,
  listFiles,
  listFilesByExtension,
  listDirectoryEntries,
  fileExists,
  loadFile,
  saveFile,
  saveImageFile,
  deleteFile,
  deleteFolder,
};
