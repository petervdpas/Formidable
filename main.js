// main.js

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

ipcMain.handle("ensure-markdown-dir", async (event, dir) => {
  const fullPath = path.resolve(dir); // Adjust based on your app's working directory rules
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log("Created markdown directory:", fullPath);
  }
  return true; // optional, just to satisfy invoke
});

ipcMain.handle("save-markdown", async (event, directory, filename, data) => {
  try {
    const dirPath = path.resolve(directory);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, filename);

    const markdownContent = generateMarkdown(data);

    fs.writeFileSync(filePath, markdownContent, "utf-8");
    return { success: true, path: filePath };
  } catch (err) {
    console.error("Failed to save markdown:", err);
    return { success: false, error: err.message };
  }
});

// Helper
function generateMarkdown(data) {
  let md = "";
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      md += `- [${value ? "x" : " "}] ${key}\n`;
    } else {
      md += `**${key}:** ${value}\n\n`;
    }
  }
  return md;
}
