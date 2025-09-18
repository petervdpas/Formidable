// main.js

const DEBOUNCE_MS = 150;

const packageJson = require("./package.json");
const { app, BrowserWindow, Menu, session, screen, nativeTheme } = require("electron");
const path = require("path");
const nodeLogger = require("./controls/nodeLogger");
const fileManager = require("./controls/fileManager");
const pluginManager = require("./controls/pluginManager");
const templateManager = require("./controls/templateManager");
const configManager = require("./controls/configManager");
const { registerIpcHandlers } = require("./controls/ipcRegistry");
const { getSafeBounds } = require("./controls/windowBounds");
const { log, warn, error } = nodeLogger;

if (process.platform === "win32") {
  const portableDataPath = path.join(process.cwd(), "user-data");
  app.setPath("userData", portableDataPath);
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function wireWindowPersistence(win) {
  const saveBounds = debounce(() => {
    if (win.isMinimized() || win.isFullScreen()) return;
    // Using frame bounds; if you switch to useContentSize, use getContentBounds() instead.
    const [width, height] = win.getSize();
    const [x, y] = win.getPosition();
    configManager.updateUserConfig({ window_bounds: { width, height, x, y } });
  }, DEBOUNCE_MS);

  win.on("resize", saveBounds);
  win.on("move", saveBounds);
  win.on("unmaximize", saveBounds);
  win.on("leave-full-screen", saveBounds);
}

function currentIconPath() {
  if (process.platform === "win32") {
    return app.isPackaged
      ? path.join(process.resourcesPath, "assets", "formidable.ico")
      : path.join(__dirname, "assets", "formidable.ico");
  }
  if (process.platform === "darwin") {
    return app.isPackaged
      ? path.join(process.resourcesPath, "assets", "formidable.icns")
      : path.join(__dirname, "assets", "formidable.icns");
  }
  // Linux (PNG)
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", "formidable.png")
    : path.join(__dirname, "assets", "formidable.png");
}

// ────────────────────────────────────────────────────────────
// Create BrowserWindow with clamped bounds
// ────────────────────────────────────────────────────────────
function createWindow() {
  // Always re-read config so we use the freshest saved bounds
  const userConfig = configManager.loadUserConfig();
  const bounds = getSafeBounds(userConfig.window_bounds);
  const themePref = (userConfig.theme || "light").toLowerCase(); // "light" | "dark" | "system"
  nativeTheme.themeSource = ["light","dark","system"].includes(themePref) ? themePref : "light";

    // Use this same color for the BrowserWindow to remove white flash
  const bg = nativeTheme.shouldUseDarkColors ? "#1e1e1e" : "#ffffff";
  
  const win = new BrowserWindow({
    ...bounds,
    backgroundColor: bg,
    show: false,
    icon: currentIconPath(),
    // If you want content-size semantics, set useContentSize: true and adjust save/restore accordingly.
    // useContentSize: true,
    additionalArguments: [
      `--appInfo=${JSON.stringify({
        name: packageJson.name,
        version: packageJson.version,
        language: userConfig.language || "en",
      })}`,
    ],
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  Menu.setApplicationMenu(null);

  win.loadFile("index.html");

  win.once("ready-to-show", () => win.show());

  win.webContents.on("did-finish-load", () => {
    const versionedTitle = `Formidable v${packageJson.version}`;
    win.setTitle(versionedTitle);
    log("[Main] Set title after load:", versionedTitle);
  });

  // Persist bounds (debounced) — replaces your old inline resize handler
  wireWindowPersistence(win);

  log("[Main] Created main BrowserWindow and loaded index.html");
  return win;
}

// ────────────────────────────────────────────────────────────
// App lifecycle
// ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const userConfig = configManager.loadUserConfig();
  app.setName("Formidable v" + packageJson.version);

  // Spellchecker language mapping
  const lang = (userConfig.language || "en").toLowerCase();
  const langMap = {
    en: "en-US",
    nl: "nl-NL",
    de: "de-DE",
    fr: "fr-FR",
  };
  const spellLang = langMap[lang] || langMap.en;
  session.defaultSession.setSpellCheckerLanguages([spellLang]);

  const isPackaged = app.isPackaged;
  const root = isPackaged ? app.getAppPath() : process.cwd();
  fileManager.setAppRoot(root);

  pluginManager.loadPlugins();
  registerIpcHandlers();

  log("[Main] App is ready. Checking environment...");

  templateManager.ensureTemplateDirectory();
  templateManager.createBasicTemplateIfMissing();

  nodeLogger.setLoggingEnabled(!!userConfig.logging_enabled);
  nodeLogger.setWriteEnabled(!!userConfig.logging_enabled);

  const win = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Re-validate and re-apply safe bounds when displays change
  const applySafeBounds = debounce(() => {
    const w = BrowserWindow.getAllWindows()[0];
    if (!w) return;
    const cfg = configManager.loadUserConfig();
    const safe = getSafeBounds(cfg.window_bounds || {});
    // If you use content-size semantics, switch to setContentBounds(safe)
    w.setBounds(safe);
  }, 100);

  screen.on("display-added", applySafeBounds);
  screen.on("display-removed", applySafeBounds);
  screen.on("display-metrics-changed", applySafeBounds);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
