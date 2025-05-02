// main.js

const {
  app,
  dialog,
  shell,
  BrowserWindow,
  Menu,
  ipcMain,
} = require("electron");
const { log, warn, error } = require("./modules/nodeLogger");
const { registerIpc } = require("./modules/ipcRoutes");

const fileManager = require("./modules/fileManager");
const fileTransformer = require("./modules/fileTransformer");
const templateManager = require("./modules/templateManager");
const formManager = require("./modules/formManager");
const markdownManager = require("./modules/markdownManager");
const configManager = require("./modules/configManager");

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
