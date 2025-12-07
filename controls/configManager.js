// controls/configManager.js

const path = require("path");
const nodeLogger = require("./nodeLogger");
const { log, error } = nodeLogger;
const fileManager = require("./fileManager");
const schema = require("../schemas/config.schema");
const bootSchema = require("../schemas/boot.schema");
const BOOT_PATH = fileManager.resolvePath("config", "boot.json");

let configPath = null;
let cachedConfig = null;
let virtualStructure = null;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function normalizeProfileFilename(name) {
  if (!name) return null;

  // strip any folder, drop extension, normalize
  const base = path
    .basename(name)
    .replace(/\.json$/i, "")
    .toLowerCase();

  // only [a-z0-9-], collapse others to "-"
  const cleaned = base.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleaned) return null;

  return `${cleaned}.json`;
}

// ─────────────────────────────────────────────
// Resolve boot profile and ensure boot.json exists
// ─────────────────────────────────────────────
function resolveBootProfile() {
  const configDir = fileManager.resolvePath("config");
  fileManager.ensureDirectory(configDir, { label: "Boot", silent: true });

  if (!fileManager.fileExists(BOOT_PATH)) {
    fileManager.saveFile(BOOT_PATH, bootSchema.defaults, { format: "json" });
  }

  const raw = fileManager.loadFile(BOOT_PATH, { format: "json" });
  const { boot, changed } = bootSchema.sanitize(raw);

  if (changed) {
    fileManager.saveFile(BOOT_PATH, boot, { format: "json" });
  }

  return boot.active_profile;
}

// ─────────────────────────────────────────────
// Set user config path based on the active profile
// ─────────────────────────────────────────────
function setUserConfigPath(profileFilename) {
  configPath = fileManager.resolvePath("config", profileFilename);
  invalidateConfigCache();
  log(`[ConfigManager] Using config path: ${configPath}`);
}

setUserConfigPath(resolveBootProfile());

// ─────────────────────────────────────────────
// Switch user profile and reload config
// ─────────────────────────────────────────────
function switchUserProfile(profileFilename) {
  const bootData = { active_profile: profileFilename };
  fileManager.saveFile(BOOT_PATH, bootData, { format: "json" });

  setUserConfigPath(profileFilename);
  return loadUserConfig(); // Refresh config and virtual structure
}

// ─────────────────────────────────────────────
// List available user profiles in the config directory
// ─────────────────────────────────────────────
function listAvailableProfiles() {
  const configDir = fileManager.resolvePath("config");

  return fileManager
    .listFilesByExtension(configDir, ".json", { silent: true })
    .filter((f) => f !== "boot.json")
    .map((filename) => {
      const fullPath = fileManager.resolvePath("config", filename);
      let authorName = "(unknown)";

      try {
        const raw = fileManager.loadFile(fullPath, {
          format: "json",
          silent: true,
        });
        const { config } = schema.sanitize(raw);
        authorName = config?.author_name?.trim() || "(unnamed)";
      } catch (err) {
        log(`[ConfigManager] Could not read ${filename}: ${err.message}`);
      }

      return {
        value: filename,
        display: `${authorName}`,
      };
    });
}

// ─────────────────────────────────────────────
// Get the current profile filename
// ─────────────────────────────────────────────
function getCurrentProfileFilename() {
  return configPath ? path.basename(configPath) : null;
}

// ─────────────────────────────────────────────
// Build virtual folder structure from disk
// ─────────────────────────────────────────────
function buildVirtualStructure(config) {
  const base = fileManager.resolvePath(config.context_folder || "./");
  const templatesPath = path.join(base, "templates");
  const storagePath = path.join(base, "storage");

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

function getSingleTemplateEntry(templateName) {
  if (!templateName) return null;

  const config = loadUserConfig();
  const base = fileManager.resolvePath(config.context_folder || "./");
  const storagePath = fileManager.joinPath(base, "storage");
  const templateStoragePath = path.join(storagePath, templateName);
  const imagesPath = path.join(templateStoragePath, "images");

  fileManager.ensureDirectory(templateStoragePath, {
    label: `Storage<${templateName}>`,
    silent: true,
  });

  fileManager.ensureDirectory(imagesPath, {
    label: `Images<${templateName}>`,
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

  return {
    id: `template:${templateName}`,
    name: templateName,
    filename: `${templateName}.yaml`,
    path: templateStoragePath,
    metaFiles,
    imageFiles,
  };
}

// ─────────────────────────────────────────────
// Import / Export user profiles
// ─────────────────────────────────────────────

function exportUserProfile(
  profileFilename,
  targetPath,
  { overwrite = false } = {}
) {
  if (!profileFilename || !targetPath) {
    return {
      success: false,
      error: "Missing profileFilename or targetPath.",
    };
  }

  const sourcePath = fileManager.resolvePath("config", profileFilename);

  if (!fileManager.fileExists(sourcePath)) {
    return {
      success: false,
      error: `Profile file not found: ${profileFilename}`,
      code: "not_found",
    };
  }

  const targetDir = path.dirname(targetPath);
  fileManager.ensureDirectory(targetDir, {
    label: "ProfileExport",
    silent: true,
  });

  const result = fileManager.copyFile(sourcePath, targetPath, { overwrite });

  const ok = typeof result === "object" ? result.success !== false : !!result;

  if (!ok) {
    return {
      success: false,
      error: (result && result.error) || "Copy failed.",
      code: "copy_failed",
    };
  }

  log(
    `[ConfigManager] Exported profile "${profileFilename}" to "${targetPath}".`
  );

  return {
    success: true,
    profileFilename,
    sourcePath,
    targetPath,
  };
}

function importUserProfile(
  sourcePath,
  { profileFilename, overwrite = false } = {}
) {
  if (!sourcePath) {
    return {
      success: false,
      error: "Missing sourcePath.",
    };
  }

  if (!fileManager.fileExists(sourcePath)) {
    return {
      success: false,
      error: `Source file not found: ${sourcePath}`,
      code: "not_found",
    };
  }

  // Determine/normalise target filename
  let finalFilename =
    profileFilename || normalizeProfileFilename(path.basename(sourcePath));

  if (!finalFilename) {
    return {
      success: false,
      error: "Unable to derive a valid profile filename.",
      code: "invalid_name",
    };
  }

  // Reject boot.json explicitly – profiles only
  if (finalFilename === "boot.json") {
    return {
      success: false,
      error: "boot.json cannot be imported as a profile.",
      code: "boot_forbidden",
    };
  }

  const targetPath = fileManager.resolvePath("config", finalFilename);

  if (fileManager.fileExists(targetPath) && !overwrite) {
    return {
      success: false,
      error: `Profile already exists: ${finalFilename}`,
      code: "exists",
      filename: finalFilename,
      targetPath,
    };
  }

  const result = fileManager.copyFile(sourcePath, targetPath, { overwrite });
  const ok = typeof result === "object" ? result.success !== false : !!result;

  if (!ok) {
    return {
      success: false,
      error: (result && result.error) || "Copy failed.",
      code: "copy_failed",
    };
  }

  // Make sure the imported file at least parses / sanitizes
  try {
    const raw = fileManager.loadFile(targetPath, {
      format: "json",
      silent: false,
    });
    const { config } = schema.sanitize(raw);
    fileManager.saveFile(targetPath, config, { format: "json" });
  } catch (err) {
    error(
      `[ConfigManager] Imported profile "${finalFilename}" is not a valid config:`,
      err
    );
    return {
      success: false,
      error: "Imported file is not a valid Formidable config.",
      code: "invalid_config",
      filename: finalFilename,
      targetPath,
    };
  }

  log(
    `[ConfigManager] Imported profile from "${sourcePath}" as "${finalFilename}".`
  );

  // Invalidate cache so it shows up correctly in listAvailableProfiles()
  invalidateConfigCache();

  return {
    success: true,
    filename: finalFilename,
    targetPath,
  };
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
module.exports = {
  switchUserProfile,
  listAvailableProfiles,
  getCurrentProfileFilename,
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
  getSingleTemplateEntry,
  exportUserProfile,
  importUserProfile,
};
