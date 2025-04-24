const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const { buildAppMenu } = require("./modules/appMenu");
const fileManager = require("./modules/fileManager");
const configManager = require("./modules/configManager");

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
}

// Ensure folders on app startup
app.whenReady().then(() => {
  fileManager.ensureSetupEnvironment();
  configManager.ensureConfigFile();

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Standard quit behavior
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// ========== IPC HANDLERS ==========

// Setup YAML handlers
ipcMain.handle("get-setup-list", () => {
  return fileManager.getSetupYamlList();
});

ipcMain.handle("load-setup-yaml", (event, name) => {
  return fileManager.loadSetupYaml(name);
});

// Config file handlers
ipcMain.handle("load-user-config", () => {
  return configManager.loadUserConfig();
});

ipcMain.handle("save-user-config", (event, cfg) => {
  return configManager.saveUserConfig(cfg);
});

ipcMain.handle("update-user-config", (event, partial) => {
  return configManager.updateUserConfig(partial);
});
