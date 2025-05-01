// main.js

const { app, dialog, BrowserWindow, ipcMain } = require("electron");

const { log, warn, error } = require("./modules/nodeLogger");
const { registerIpc } = require("./modules/ipcRoutes");

const { SingleFileRepository } = require("./modules/sfr");
const fileManager = require("./modules/fileManager");
const fileTransformer = require("./modules/fileTransformer");
const templateManager = require("./modules/templateManager");
const configManager = require("./modules/configManager");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: fileManager.joinPath(__dirname, "preload.js"),
    },
    icon: fileManager.joinPath(__dirname, "assets", "formidable.png"),
  });

  win.loadFile("index.html");

  log("[Main] Created main BrowserWindow and loaded index.html");
}

app.whenReady().then(() => {
  log("[Main] App is ready. Checking environment...");

  templateManager.ensureTemplatesEnvironment();
  configManager.ensureConfigFile();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ================= IPC HANDLERS =================

ipcMain.handle("app-quit", () => {
  app.quit();
});

ipcMain.handle("toggle-devtools", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const wc = win.webContents;
    wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools();
  }
});

// Template YAML handlers
registerIpc("list-template-files", () => templateManager.getTemplateList());
registerIpc("load-template-file", (event, name) =>
  templateManager.loadTemplateFile(name)
);
registerIpc("save-template-file", (event, name, data) =>
  templateManager.saveTemplateFile(name, data)
);
registerIpc("get-template-descriptor", (event, name) => {
  return templateManager.getTemplateDescriptor(name);
});
registerIpc("delete-template-file", (event, name) =>
  templateManager.deleteTemplateFile(name)
);

// Config handlers
registerIpc("load-user-config", () => configManager.loadUserConfig());
registerIpc("save-user-config", (event, cfg) =>
  configManager.saveUserConfig(cfg)
);
registerIpc("update-user-config", (event, partial) =>
  configManager.updateUserConfig(partial)
);

// Filesystem utilities
registerIpc("ensure-markdown-dir", (event, dir) => {
  const fullPath = fileManager.resolvePath(dir);
  fileManager.ensureDirectory(fullPath, { silent: true });
  log("[IPC] Ensured markdown directory exists:", fullPath);
  return true;
});

// Meta repository
registerIpc("list-meta", (event, directory) => metaRepo.listFiles(directory));
registerIpc("load-meta", (event, directory, filename) =>
  metaRepo.loadFromBase(directory, filename)
);
registerIpc("save-meta", (event, directory, filename, data) =>
  metaRepo.saveFromBase(directory, filename, data)
);

// Markdown repository
registerIpc("list-markdown", (event, directory) =>
  markdownRepo.listFiles(directory)
);
registerIpc("load-markdown", (event, directory, filename) =>
  markdownRepo.loadFromBase(directory, filename)
);
registerIpc("save-markdown", (event, directory, filename, data) =>
  markdownRepo.saveFromBase(directory, filename, data, {
    transform: fileTransformer.generateMarkdownFromFields,
  })
);

// Markdown transform
registerIpc("parse-markdown-to-fields", (event, markdownContent) =>
  fileTransformer.parseMarkdownToFields(markdownContent)
);
registerIpc("generate-markdown-from-fields", (event, fieldsObject) =>
  fileTransformer.generateMarkdownFromFields(fieldsObject)
);

registerIpc("dialog-choose-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

registerIpc("get-app-root", () => process.cwd());