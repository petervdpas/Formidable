// controls/setupManager.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const { app } = require("electron");
const fileManager = require("./fileManager");
const { log } = require("./nodeLogger");

/**
 * Determine the user-writable data directory for packaged Linux/Mac installs.
 * Returns null for dev mode and Windows (no redirect needed).
 */
function getUserDataDir() {
  if (!app.isPackaged) return null;
  if (process.platform === "win32") return null;

  const xdgData =
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(xdgData, "Formidable");
}

/**
 * Run first-run setup if needed.
 * - Creates config dir + default config if missing (first run)
 * - Copies bundled examples if the examples dir is missing
 * Returns the user data directory path, or null if no redirect is needed.
 */
function runSetup() {
  const userDataDir = getUserDataDir();
  if (!userDataDir) return null;

  const configDir = path.join(userDataDir, "config");
  const bootPath = path.join(configDir, "boot.json");
  const userConfigPath = path.join(configDir, "user.json");
  const userExamplesDir = path.join(userDataDir, "examples");
  const bundledExamplesDir = path.join(fileManager.getAppRoot(), "examples");

  // Ensure config directory exists
  fs.mkdirSync(configDir, { recursive: true });

  // Create boot.json if missing (first run)
  if (!fs.existsSync(bootPath)) {
    const bootSchema = require("../schemas/boot.schema");
    fs.writeFileSync(bootPath, JSON.stringify(bootSchema.defaults, null, 2), "utf-8");
    log("[Setup] Created boot.json");
  }

  // Create user.json if missing (first run)
  if (!fs.existsSync(userConfigPath)) {
    const configSchema = require("../schemas/config.schema");
    const defaults = { ...configSchema.defaults, context_folder: "./examples" };
    fs.writeFileSync(userConfigPath, JSON.stringify(defaults, null, 2), "utf-8");
    log("[Setup] Created user.json with context_folder: ./examples");
  }

  // Copy bundled examples if missing
  if (!fs.existsSync(userExamplesDir) && fs.existsSync(bundledExamplesDir)) {
    fileManager.copyFolderRecursive(bundledExamplesDir, userExamplesDir, false);
    log("[Setup] Copied bundled examples to: " + userExamplesDir);
  }

  log("[Setup] User data directory: " + userDataDir);
  return userDataDir;
}

module.exports = { runSetup, getUserDataDir };
