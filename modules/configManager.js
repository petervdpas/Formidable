// modules/configManager.js

const { log, error } = require("./nodeLogger");
const fileManager = require("./fileManager");

const configDir = fileManager.resolvePath("config");
const configPath = fileManager.resolvePath("config", "user.json");

const defaultConfig = {
  recent_setups: ["basic.yaml"],
  last_opened_markdown: { "basic.yaml": "" },
  selected_template: "basic.yaml",
  theme: "light",
  font_size: 14,
};

log("[ConfigManager] Config directory:", configDir);
log("[ConfigManager] Config file path:", configPath);

// Ensure config dir and user.json exist
function ensureConfigFile() {
  fileManager.ensureDirectory(configDir, { silent: false });

  if (!configFileExists()) {
    fileManager.saveFile(configPath, defaultConfig, {
      format: "json",
      silent: false,
    });
    log("[ConfigManager] Created user.json with default settings.");
  } else {
    log("[ConfigManager] Config file already exists.");
  }
}

// Internal file existence helper
function configFileExists() {
  try {
    fileManager.loadFile(configPath, { format: "json", silent: true });
    return true;
  } catch {
    return false;
  }
}

// Load full user config
function loadUserConfig() {
  ensureConfigFile();

  try {
    const config = fileManager.loadFile(configPath, {
      format: "json",
      silent: false,
    });

    // Auto-repair missing fields
    let updated = false;
    for (const key in defaultConfig) {
      if (!(key in config)) {
        config[key] = defaultConfig[key];
        updated = true;
      }
    }

    if (updated) {
      saveUserConfig(config);
      log("[ConfigManager] Auto-repaired user config: missing fields added.");
    } else {
      log("[ConfigManager] User config loaded successfully.");
    }

    return config;
  } catch (err) {
    error("[ConfigManager] Failed to load user config:", err);
    return { ...defaultConfig };
  }
}

// Save full config
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

// Merge a partial update into current config
function updateUserConfig(partial) {
  try {
    const current = loadUserConfig();
    const updated = { ...current, ...partial };
    saveUserConfig(updated);
    log("[ConfigManager] Updated user config with partial changes:", partial);
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
