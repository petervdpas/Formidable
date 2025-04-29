// main.js

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const { log, warn, error } = require("./modules/nodeLogger");
const { buildAppMenu } = require("./modules/appMenu");
const { registerIpc } = require("./modules/ipcRoutes");

const { SingleFileRepository } = require("./modules/sfr");
const fileManager = require("./modules/fileManager");
const setupManager = require("./modules/setupManager");
const configManager = require("./modules/configManager");
const fileTransformer = require("./modules/fileTransformer");

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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
  buildAppMenu(win);

  log("[Main] Created main BrowserWindow and loaded index.html");
}

app.whenReady().then(() => {
  log("[Main] App is ready. Checking environment...");

  setupManager.ensureSetupEnvironment();
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

// Setup YAML handlers
registerIpc("get-setup-list", () => setupManager.getSetupYamlList());
registerIpc("load-setup-yaml", (event, name) => setupManager.loadSetupYaml(name));

// Config handlers
registerIpc("load-user-config", () => configManager.loadUserConfig());
registerIpc("save-user-config", (event, cfg) => configManager.saveUserConfig(cfg));
registerIpc("update-user-config", (event, partial) => configManager.updateUserConfig(partial));

// Filesystem utilities
registerIpc("ensure-markdown-dir", (event, dir) => {
  const fullPath = fileManager.resolvePath(dir);
  fileManager.ensureDirectory(fullPath, { silent: true });
  log("[IPC] Ensured markdown directory exists:", fullPath);
  return true;
});

registerIpc("list-markdown-files", (event, dir) => {
  const fullPath = fileManager.resolvePath(dir);
  return fileManager.listFilesByExtension(fullPath, ".md");
});

registerIpc("load-markdown-file", async (event, { dir, filename }) => {
  const fullPath = path.join(dir, filename);
  return await fs.promises.readFile(fullPath, "utf-8");
});

// Meta repository
registerIpc("load-meta", (event, directory, filename) =>
  metaRepo.loadFromBase(directory, filename)
);

registerIpc("save-meta", (event, directory, filename, data) =>
  metaRepo.saveFromBase(directory, filename, data)
);

// Markdown repository
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
