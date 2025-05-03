// main.js

const {
  app,
  dialog,
  shell,
  clipboard,
  BrowserWindow,
  Menu,
  ipcMain,
} = require("electron");
const { log, warn, error } = require("./controls/nodeLogger");
const { registerIpc } = require("./controls/ipcRoutes");

const fileManager = require("./controls/fileManager");
const fileTransformer = require("./controls/fileTransformer");
const templateManager = require("./controls/templateManager");
const formManager = require("./controls/formManager");
const markdownManager = require("./controls/markdownManager");
const configManager = require("./controls/configManager");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: "#808080",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: fileManager.joinPath(__dirname, "preload.js"),
    },
    icon: fileManager.joinPath(__dirname, "assets", "formidable.png"),
  });

  // Disable Electron's native menu
  Menu.setApplicationMenu(null);

  win.loadFile("index.html");
  win.setTitle("Formidable v1.0");

  win.once("ready-to-show", () => {
    win.show();
  });

  log("[Main] Created main BrowserWindow and loaded index.html");
}

app.whenReady().then(() => {
  log("[Main] App is ready. Checking environment...");

  templateManager.ensureTemplateDirectory();
  templateManager.createBasicTemplateIfMissing();
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
ipcMain.handle("shell-open-path", async (event, targetPath) => {
  return await shell.openPath(targetPath); // returns empty string on success
});
ipcMain.handle("shell-open-external", async (event, url) => {
  return await shell.openExternal(url); // Opens in default browser
});
ipcMain.on("window-reload", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.reload();
});
ipcMain.on("window-minimize", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.minimize();
});
ipcMain.on("window-maximize", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.maximize();
});
ipcMain.on("window-close", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.close();
});
ipcMain.handle("clipboard-write", (e, text) => {
  clipboard.writeText(text);
});
ipcMain.handle("clipboard-read", () => {
  return clipboard.readText();
});

// Template handlers
registerIpc("list-templates", () => templateManager.listTemplates());
registerIpc("load-template", (e, name) => templateManager.loadTemplate(name));
registerIpc("save-template", (e, name, data) =>
  templateManager.saveTemplate(name, data)
);
registerIpc("delete-template", (e, name) =>
  templateManager.deleteTemplate(name)
);
registerIpc("get-template-descriptor", (e, name) =>
  templateManager.getTemplateDescriptor(name)
);
registerIpc("create-basic-template", () =>
  templateManager.createBasicTemplateIfMissing()
);

// Form JSON handlers
registerIpc("ensure-form-dir", (event, dir) =>
  formManager.ensureFormDirectory(dir)
);
registerIpc("list-forms", (event, dir) => formManager.listForms(dir));
registerIpc("load-form", (event, dir, filename, templateFields = []) =>
  formManager.loadForm(dir, filename, templateFields)
);
registerIpc("save-form", (event, dir, filename, data, fields = []) =>
  formManager.saveForm(dir, filename, data, fields)
);
registerIpc("delete-form", (event, dir, filename) =>
  formManager.deleteForm(dir, filename)
);

// Markdown handlers
registerIpc("ensure-markdown-dir", (event, dir) =>
  markdownManager.ensureMarkdownDirectory(dir)
);
registerIpc("list-markdowns", (event, dir) =>
  markdownManager.listMarkdownFiles(dir)
);
registerIpc("load-markdown", (event, dir, filename) =>
  markdownManager.loadMarkdownFile(dir, filename)
);
registerIpc("save-markdown", (event, dir, filename, data) =>
  markdownManager.saveMarkdownFile(dir, filename, data)
);
registerIpc("delete-markdown", (event, dir, filename) =>
  markdownManager.deleteMarkdownFile(dir, filename)
);

// Config handlers
registerIpc("load-user-config", () => configManager.loadUserConfig());
registerIpc("save-user-config", (event, cfg) =>
  configManager.saveUserConfig(cfg)
);
registerIpc("update-user-config", (event, partial) =>
  configManager.updateUserConfig(partial)
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

registerIpc("resolve-path", (event, ...segments) => {
  return fileManager.resolvePath(...segments);
});

registerIpc("file-exists", (event, path) => {
  return fileManager.fileExists(path);
});
