// configManager.js

const fs = require("fs");
const path = require("path");
const { log, warn, error } = require("./nodeLogger"); // <--- use centralized logger

const configDir = path.join(__dirname, "..", "config");
const configPath = path.join(configDir, "user.json");

const defaultConfig = {
  recent_setups: ["basic.yaml"],
  last_opened_markdown: {
    "basic.yaml": "",
  },
  selected_template: "basic.yaml",
  theme: "light",
  font_size: 14,
};

log("[ConfigManager] Config directory:", configDir);
log("[ConfigManager] Config file path:", configPath);

// Ensure config dir and user.json exist
function ensureConfigFile() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    log("[ConfigManager] Created config directory:", configDir);
  } else {
    log("[ConfigManager] Config directory already exists.");
  }

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      "utf-8"
    );
    log("[ConfigManager] Created user.json with default settings.");
  } else {
    log("[ConfigManager] Config file already exists.");
  }
}

// Load full user config
function loadUserConfig() {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    let config = JSON.parse(raw);

    // --- Auto-repair missing fields ---
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
    return { ...defaultConfig }; // Return default config fallback
  }
}

// Save full config
function saveUserConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
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
