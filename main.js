// main.js

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const { log, warn, error } = require("./modules/nodeLogger"); // <-- use centralized logger

const { buildAppMenu } = require("./modules/appMenu");
const fileManager = require("./modules/fileManager");
const setupManager = require("./modules/setupManager"); 
const fileTransformer = require("./modules/fileTransformer.js");
const metaManager = require("./modules/metaManager");
const markdownManager = require("./modules/markdownManager");
const configManager = require("./modules/configManager");
const sfr = require("./modules/sfr");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
  buildAppMenu(win);

  log("[Main] Created main BrowserWindow and loaded index.html");
}

// Ensure folders on app startup
app.whenReady().then(() => {
  log("[Main] App is ready. Checking environment...");

  setupManager.ensureSetupEnvironment();
  configManager.ensureConfigFile();

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      log("[Main] Recreating window after activation.");
      createWindow();
    }
  });
});

// Standard quit behavior
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    log("[Main] Quitting app (not macOS).");
    app.quit();
  }
});

// ========== IPC HANDLERS ==========

// Setup YAML handlers
ipcMain.handle("get-setup-list", () => {
  log("[IPC] get-setup-list triggered");
  return setupManager.getSetupYamlList();
});

ipcMain.handle("load-setup-yaml", (event, name) => {
  log("[IPC] load-setup-yaml triggered for:", name);
  return setupManager.loadSetupYaml(name);
});

// Config file handlers
ipcMain.handle("load-user-config", () => {
  log("[IPC] load-user-config triggered");
  return configManager.loadUserConfig();
});

ipcMain.handle("save-user-config", (event, cfg) => {
  log("[IPC] save-user-config triggered");
  return configManager.saveUserConfig(cfg);
});

ipcMain.handle("update-user-config", (event, partial) => {
  log("[IPC] update-user-config triggered");
  return configManager.updateUserConfig(partial);
});

// Ensure markdown directory exists
ipcMain.handle("ensure-markdown-dir", async (event, dir) => {
  try {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log("[IPC] Created markdown directory:", fullPath);
    } else {
      log("[IPC] Markdown directory already exists:", fullPath);
    }
    return true;
  } catch (err) {
    error("[IPC] Failed to ensure markdown dir:", err);
    return false;
  }
});

// List markdown files
ipcMain.handle("list-markdown-files", async (event, directory) => {
  try {
    const dirPath = path.isAbsolute(directory)
      ? directory
      : path.join(__dirname, directory);

    log("[IPC] Listing markdown files at:", dirPath);

    if (!fs.existsSync(dirPath)) {
      warn("[IPC] Directory does NOT exist:", dirPath);
      return [];
    }

    const files = fs.readdirSync(dirPath);
    log("[IPC] Found markdown files:", files);
    return files.filter((file) => file.endsWith(".md"));
  } catch (err) {
    error("[IPC] Failed to list markdown files:", err);
    return [];
  }
});

ipcMain.handle("load-markdown-file", async (event, { dir, filename }) => {
  try {
    const fullPath = path.join(dir, filename);
    const content = await fs.promises.readFile(fullPath, "utf-8");  // <-- the fix: await + utf-8
    return content;
  } catch (err) {
    console.error("[Main] Failed to load markdown file:", err);
    throw err;
  }
});

ipcMain.handle("load-markdown-meta", async (event, { dir, filename }) => {
  return sfr.loadMetadata(dir, filename);
});

ipcMain.handle("load-meta", async (event, directory, filename) => {
  return metaManager.loadMeta(directory, filename);
});

ipcMain.handle("save-meta", async (event, directory, filename, data) => {
  return metaManager.saveMeta(directory, filename, data);
});

ipcMain.handle("load-markdown", async (event, directory, filename) => {
  return markdownManager.loadMarkdown(directory, filename);
});

ipcMain.handle("save-markdown", async (event, directory, filename, data) => {
  return markdownManager.saveMarkdown(directory, filename, data);
});

ipcMain.handle("parse-markdown-to-fields", (event, markdownContent) => {
  return fileTransformer.parseMarkdownToFields(markdownContent);
});

ipcMain.handle("generate-markdown-from-fields", (event, fieldsObject) => {
  return fileTransformer.generateMarkdownFromFields(fieldsObject);
});
