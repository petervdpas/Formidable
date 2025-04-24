const fs = require("fs");
const path = require("path");

const configDir = path.join(__dirname, "..", "config");
const configPath = path.join(configDir, "user.json");

const defaultConfig = {
  recent_setups: ["basic.yaml"],
  last_opened_markdown: {
    "basic.yaml": "",
  },
  theme: "light",
  font_size: 14,
};

// Ensure config dir and file exist
function ensureConfigFile() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log("Created config directory:", configDir);
  }

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      "utf-8"
    );
    console.log("Created user.json with default settings");
  }
}

// Load config
function loadUserConfig() {
  ensureConfigFile();
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

// Save config
function saveUserConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

// Optional: merge partial update into current config
function updateUserConfig(partial) {
  const current = loadUserConfig();
  const updated = { ...current, ...partial };
  saveUserConfig(updated);
}

module.exports = {
  ensureConfigFile,
  loadUserConfig,
  saveUserConfig,
  updateUserConfig,
};
