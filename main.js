// main.js

const packageJson = require("./package.json");
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const nodeLogger = require("./controls/nodeLogger");
const fileManager = require("./controls/fileManager");
const pluginManager = require("./controls/pluginManager");
const templateManager = require("./controls/templateManager");
const configManager = require("./controls/configManager");
const { registerIpcHandlers } = require("./controls/ipcRegistry");
const { getSafeBounds } = require("./controls/windowBounds");
const { log, warn, error } = nodeLogger;

const userConfig = configManager.loadUserConfig();

if (process.platform === "win32") {
  const portableDataPath = path.join(process.cwd(), "user-data");
  app.setPath("userData", portableDataPath);
}

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, "assets", "formidable.ico")
  : path.join(__dirname, "assets", "formidable.ico");

function createWindow() {
  const bounds = getSafeBounds(userConfig.window_bounds);

  const win = new BrowserWindow({
    ...bounds,
    backgroundColor: "#808080",
    show: false,
    icon: iconPath,
    additionalArguments: [
      `--appInfo=${JSON.stringify({
        name: packageJson.name,
        version: packageJson.version,
      })}`,
    ],
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      // sandbox: true,
      // webSecurity: true,
      // allowRunningInsecureContent: false,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  //Menu.setApplicationMenu(null);

  win.loadFile("index.html");

  win.once("ready-to-show", () => win.show());

  win.webContents.on("did-finish-load", () => {
    const versionedTitle = `Formidable v${packageJson.version}`;
    win.setTitle(versionedTitle);
    log("[Main] Set title after load:", versionedTitle);
  });

  win.on("resize", () => {
    if (!win.isMinimized() && !win.isFullScreen()) {
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      configManager.updateUserConfig({
        window_bounds: { width, height, x, y },
      });
    }
  });

  log("[Main] Created main BrowserWindow and loaded index.html");
}

app.whenReady().then(() => {
  const isPackaged = app.isPackaged;
  const root = isPackaged ? app.getAppPath() : process.cwd();
  fileManager.setAppRoot(root);

  // fileManager.setAppRoot(process.cwd());

  pluginManager.loadPlugins();
  registerIpcHandlers();

  log("[Main] App is ready. Checking environment...");

  /*
  log("[DEBUG] app.getAppPath() =", app.getAppPath());
  log("[DEBUG] process.cwd() =", process.cwd());
  log("[DEBUG] __dirname =", __dirname);
  */

  templateManager.ensureTemplateDirectory();
  templateManager.createBasicTemplateIfMissing();

  nodeLogger.setLoggingEnabled(!!userConfig.logging_enabled);
  nodeLogger.setWriteEnabled(!!userConfig.logging_enabled);

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
