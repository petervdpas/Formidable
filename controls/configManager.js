// controls/configManager.js

const path = require("path");
const nodeLogger = require("./nodeLogger");
const { log, error } = nodeLogger;
const fileManager = require("./fileManager");
const schema = require("../schemas/config.schema");

const configPath = fileManager.resolvePath("config", "user.json");

let cachedConfig = null;
let virtualStructure = null;

// ─────────────────────────────────────────────
// Build virtual folder structure from disk
// ─────────────────────────────────────────────
function buildVirtualStructure(config) {
  const base = fileManager.resolvePath(config.context_folder || "./");
  const templatesPath = fileManager.joinPath(base, "templates");
  const storagePath = fileManager.joinPath(base, "storage");

  fileManager.ensureDirectory(templatesPath, {
    label: "Templates",
    silent: true,
  });
  fileManager.ensureDirectory(storagePath, {
    label: "Storage",
    silent: true,
  });

  const templateFiles = fileManager.listFilesByExtension(
    templatesPath,
    ".yaml",
    {
      silent: true,
    }
  );

  const templateStorageFolders = {};

  for (const file of templateFiles) {
    const name = file.replace(/\.yaml$/, "");
    const templateStoragePath = fileManager.joinPath(storagePath, name);
    const imagesPath = fileManager.joinPath(templateStoragePath, "images");

    fileManager.ensureDirectory(templateStoragePath, {
      label: `Storage<${name}>`,
      silent: true,
    });

    fileManager.ensureDirectory(imagesPath, {
      label: `Images<${name}>`,
      silent: true,
    });

    const metaFiles = fileManager.listFilesByExtension(
      templateStoragePath,
      ".meta.json",
      {
        silent: true,
      }
    );

    const imageFiles = fileManager.listFiles(imagesPath, { silent: true });

    templateStorageFolders[name] = {
      name, // e.g. "basic"
      filename: file, // e.g. "basic.yaml"
      path: templateStoragePath,
      metaFiles,
      imageFiles,
    };
  }

  return {
    context: base,
    templates: templatesPath,
    storage: storagePath,
    templateStorageFolders,
  };
}

// ─────────────────────────────────────────────
// Ensure config file exists
// ─────────────────────────────────────────────
function ensureConfigFile() {
  const fullPath = fileManager.resolvePath("config");
  fileManager.ensureDirectory(fullPath, {
    label: "ConfigManager",
    silent: true,
  });

  if (!fileManager.fileExists(configPath)) {
    fileManager.saveFile(configPath, schema.defaults, {
      format: "json",
      silent: false,
    });
    log("[ConfigManager] Created user.json with default settings.");
  } else {
    log("[ConfigManager] Config file already exists.");
  }
}

// ─────────────────────────────────────────────
// Load config and structure (cached if available)
// ─────────────────────────────────────────────
function loadUserConfig() {
  if (cachedConfig && virtualStructure) return cachedConfig;

  ensureConfigFile();

  try {
    const raw = fileManager.loadFile(configPath, {
      format: "json",
      silent: false,
    });

    const { config, changed } = schema.sanitize(raw);

    if (changed) {
      saveUserConfig(config);
      log("[ConfigManager] Repaired missing config fields.");
    }

    cachedConfig = config;
    virtualStructure = buildVirtualStructure(config);
    return config;
  } catch (err) {
    error("[ConfigManager] Failed to load config:", err);
    cachedConfig = { ...schema.defaults };
    virtualStructure = buildVirtualStructure(cachedConfig);
    return cachedConfig;
  }
}

// ─────────────────────────────────────────────
// Save config and update structure
// ─────────────────────────────────────────────
function saveUserConfig(config) {
  try {
    fileManager.saveFile(configPath, config, {
      format: "json",
      silent: false,
    });
    cachedConfig = config;
    virtualStructure = buildVirtualStructure(config);
    log("[ConfigManager] Saved user config.");
  } catch (err) {
    error("[ConfigManager] Failed to save user config:", err);
  }
}

// ─────────────────────────────────────────────
// Merge partial config and update
// ─────────────────────────────────────────────
function updateUserConfig(partial) {
  try {
    const current = loadUserConfig();
    const updated = { ...current, ...partial };
    saveUserConfig(updated);

    if (partial.hasOwnProperty("logging_enabled")) {
      nodeLogger.setLoggingEnabled(!!partial.logging_enabled);
      nodeLogger.setWriteEnabled(!!partial.logging_enabled);
    }

    log("[ConfigManager] Merged partial config:", partial);
  } catch (err) {
    error("[ConfigManager] Failed to update user config:", err);
  }
}

// ─────────────────────────────────────────────
// Clear cached config and structure
// ─────────────────────────────────────────────
function invalidateConfigCache() {
  cachedConfig = null;
  virtualStructure = null;
}

// ─────────────────────────────────────────────
// Auto-sync storage folders from templates
// ─────────────────────────────────────────────
function getVirtualStructure() {
  if (!cachedConfig || !virtualStructure) loadUserConfig();

  // Fully rebuild every time to stay in sync with filesystem
  virtualStructure = buildVirtualStructure(cachedConfig);
  return virtualStructure;
}

// ─────────────────────────────────────────────
// Context path access
// ─────────────────────────────────────────────
function getContextPath() {
  const config = loadUserConfig();
  const absPath = fileManager.resolvePath(config.context_folder || "./");
  fileManager.ensureDirectory(absPath, { label: "Context", silent: true });
  return absPath;
}

function getContextTemplatesPath() {
  return getVirtualStructure().templates;
}

function getContextStoragePath() {
  return getVirtualStructure().storage;
}

function getTemplateStorageInfo(templateFilename) {
  if (!templateFilename || typeof templateFilename !== "string") return null;
  const name = templateFilename.replace(/\.yaml$/, "");
  return getVirtualStructure().templateStorageFolders[name] || null;
}

function getTemplateStoragePath(templateFilename) {
  const info = getTemplateStorageInfo(templateFilename);
  return info?.path || null;
}

function getTemplateMetaFiles(templateFilename) {
  const info = getTemplateStorageInfo(templateFilename);
  return info?.metaFiles || [];
}

function getTemplateImageFiles(templateFilename) {
  const info = getTemplateStorageInfo(templateFilename);
  return info?.imageFiles || [];
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
module.exports = {
  ensureConfigFile,
  loadUserConfig,
  updateUserConfig,
  invalidateConfigCache,
  getVirtualStructure,
  getContextPath,
  getContextTemplatesPath,
  getContextStoragePath,
  getTemplateStorageInfo,
  getTemplateStoragePath,
  getTemplateMetaFiles,
  getTemplateImageFiles,
};
