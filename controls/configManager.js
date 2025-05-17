// controls/configManager.js

const nodeLogger = require("./nodeLogger");
const { log, error } = nodeLogger;
const fileManager = require("./fileManager");
const schema = require("../schemas/config.schema");

const configPath = fileManager.resolvePath("config", "user.json");

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

function loadUserConfig() {
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

    return config;
  } catch (err) {
    error("[ConfigManager] Failed to load config:", err);
    return { ...schema.defaults };
  }
}

function saveUserConfig(config) {
  try {
    fileManager.saveFile(configPath, config, {
      format: "json",
      silent: false,
    });
    log("[ConfigManager] Saved user config.");
  } catch (err) {
    error("[ConfigManager] Failed to save user config:", err);
  }
}

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

module.exports = {
  ensureConfigFile,
  loadUserConfig,
  saveUserConfig,
  updateUserConfig,
};
