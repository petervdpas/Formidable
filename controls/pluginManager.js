// controls/pluginManager.js

const https = require("https");
const { log, error } = require("./nodeLogger");
const fileManager = require("./fileManager");
const pluginSchema = require("../schemas/plugin.schema.js");

const pluginRepo = Object.create(null);

function getSafePluginName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getPluginRoot() {
  return fileManager.resolvePath("plugins");
}

function ensurePluginFolder() {
  fileManager.ensureDirectory(getPluginRoot(), {
    label: "PluginManager",
    silent: true,
  });
}

// ─────────────────────────────────────────────────────────────
// Load all plugins: reads plugin.json and optionally plugin.js
// ─────────────────────────────────────────────────────────────
function loadPlugins() {
  ensurePluginFolder();

  const entries = fileManager.listDirectoryEntries(getPluginRoot(), {
    silent: true,
  });
  const folders = entries.filter((e) => e.isDirectory).map((e) => e.name);

  log(`[PluginManager] Found ${folders.length} plugin folder(s)`);

  for (const folder of folders) {
    const pluginDir = fileManager.joinPath(getPluginRoot(), folder);
    const pluginPath = fileManager.joinPath(pluginDir, "plugin.js");
    const metaPath = fileManager.joinPath(pluginDir, "plugin.json");

    try {
      if (!fileManager.fileExists(metaPath)) {
        log(`[PluginManager] Skipping "${folder}" (no plugin.json)`);
        continue;
      }

      const meta = fileManager.loadFile(metaPath, {
        format: "json",
        silent: true,
      });

      let run = null;
      if (fileManager.fileExists(pluginPath) && meta.target !== "frontend") {
        delete require.cache[require.resolve(pluginPath)];
        const pluginExport = require(pluginPath);
        run =
          typeof pluginExport.run === "function"
            ? pluginExport.run
            : pluginExport;
      }

      const pluginDef = run ? { ...meta, run } : { ...meta };
      const plugin = pluginSchema.sanitize(
        { name: folder, ...pluginDef },
        folder
      );

      pluginRepo[plugin.name] = plugin;
      log(
        `[PluginManager] Registered plugin: ${plugin.name} (${plugin.version})`
      );
    } catch (err) {
      error(`[PluginManager] Failed to load plugin "${folder}":`, err.message);
    }
  }
}

function getPluginCode(name) {
  const safeName = getSafePluginName(name);
  const pluginPath = fileManager.joinPath(
    getPluginRoot(),
    safeName,
    "plugin.js"
  );

  if (!fileManager.fileExists(pluginPath)) {
    return { success: false, error: `Plugin "${name}" not found.` };
  }

  try {
    const code = fileManager.loadFile(pluginPath, {
      format: "text",
      silent: true,
    });
    return { success: true, code };
  } catch (err) {
    error(`[PluginManager] Failed to read code for "${name}":`, err.message);
    return { success: false, error: err.message };
  }
}

async function runPlugin(name, context = {}) {
  const plugin = pluginRepo[name];
  if (!plugin) return { error: `Plugin "${name}" not found.` };

  if (!plugin.enabled) {
    log(`[PluginManager] Plugin "${name}" is disabled. Skipping run.`);
    return { success: false, message: "Plugin is disabled." };
  }

  if (plugin.target === "frontend") {
    log(
      `[PluginManager] Plugin "${name}" is frontend-only. Skipping backend run.`
    );
    return { success: false, message: "Frontend plugin. Not run on backend." };
  }

  try {
    const result = await plugin.run(context);
    log(`[PluginManager] Plugin "${name}" executed successfully.`);
    return result;
  } catch (err) {
    error(`[PluginManager] Plugin "${name}" failed:`, err.message || err);
    return { error: err.message || "Plugin crashed." };
  }
}

function listPlugins() {
  return Object.keys(pluginRepo).map((name) => {
    const {
      version,
      description = "",
      author = "",
      tags = [],
      enabled,
      target = "backend",
    } = pluginRepo[name];

    return { name, version, description, author, tags, enabled, target };
  });
}

function reloadPlugins() {
  for (const key in pluginRepo) delete pluginRepo[key];
  loadPlugins();
}

function deletePlugin(name) {
  const safeName = getSafePluginName(name);
  const pluginDir = fileManager.joinPath(getPluginRoot(), safeName);

  try {
    if (
      !fileManager.fileExists(fileManager.joinPath(pluginDir, "plugin.json"))
    ) {
      return { success: false, error: `Plugin "${name}" not found.` };
    }

    const deleted = fileManager.deleteFolder(pluginDir, { silent: false });

    if (deleted) {
      delete pluginRepo[safeName];
      log(`[PluginManager] Deleted plugin "${safeName}"`);
      return { success: true, message: `Plugin "${safeName}" deleted.` };
    } else {
      return {
        success: false,
        error: `Failed to delete plugin "${safeName}".`,
      };
    }
  } catch (err) {
    error(`[PluginManager] Error deleting plugin "${safeName}":`, err.message);
    return { success: false, error: err.message };
  }
}

function getPluginSettings(name) {
  const safeName = getSafePluginName(name);
  const settingsPath = fileManager.joinPath(
    getPluginRoot(),
    safeName,
    "settings.json"
  );

  if (!fileManager.fileExists(settingsPath)) {
    return {}; // default empty settings
  }

  try {
    return fileManager.loadFile(settingsPath, {
      format: "json",
      silent: true,
    });
  } catch (err) {
    error(
      `[PluginManager] Failed to read settings for "${name}":`,
      err.message
    );
    return {};
  }
}

function savePluginSettings(name, settings) {
  const safeName = getSafePluginName(name);
  const settingsPath = fileManager.joinPath(
    getPluginRoot(),
    safeName,
    "settings.json"
  );

  try {
    fileManager.saveFile(settingsPath, settings, {
      format: "json",
      silent: true,
    });
    log(`[PluginManager] Saved settings for "${name}"`);
    return { success: true };
  } catch (err) {
    error(
      `[PluginManager] Failed to save settings for "${name}":`,
      err.message
    );
    return { success: false, error: err.message };
  }
}

function getFrontendBoilerplate(name) {
  return `// plugins/${name}/plugin.js
export function run() {
  const { button, modal } = window.FPA;
  const { createButton } = button;
  const { setupPluginModal } = modal;

  const { show } = setupPluginModal({
    id: "plugin-example-modal",
    title: "Plugin Injected",
    body: "",

    prepareBody: (modalEl, bodyEl) => {
      const p = document.createElement("p");
      p.textContent =
        "Hello to a Formidable World! This is a plugin-injected modal.";
      bodyEl.appendChild(p);

      const btn = createButton({
        text: "Toast!",
        className: "btn-success",
        onClick: () =>
          emit("ui:toast", { message: "Plugin says hi!", variant: "success" }),
        ariaLabel: "Send toast",
      });
      bodyEl.appendChild(btn);
    },
  });

  show();
}
`;
}

function getBackendBoilerplate(name) {
  return `// plugins/${name}/plugin.js
exports.run = function (context) {
  console.log("Hello from ${name}!");
  return { message: "Hello World", context };
};`;
}

function createPlugin(folderName, target = "frontend") {
  ensurePluginFolder();

  const safeName = getSafePluginName(folderName);
  const pluginDir = fileManager.joinPath(getPluginRoot(), safeName);
  const pluginFile = fileManager.joinPath(pluginDir, "plugin.js");
  const metaFile = fileManager.joinPath(pluginDir, "plugin.json");
  const settingsFile = fileManager.joinPath(pluginDir, "settings.json");

  const boilerplateCode =
    target === "frontend"
      ? getFrontendBoilerplate(safeName)
      : getBackendBoilerplate(safeName);

  const boilerplateMeta = {
    name: safeName,
    version: "1.0.0",
    description: "A new plugin",
    author: "Unknown",
    tags: [],
    enabled: true,
    target,
  };

  try {
    fileManager.ensureDirectory(pluginDir, {
      label: `Plugin<${safeName}>`,
      silent: true,
    });

    fileManager.saveFile(pluginFile, boilerplateCode, {
      format: "text",
      silent: false,
    });

    fileManager.saveFile(metaFile, boilerplateMeta, {
      format: "json",
      silent: true,
    });

    // 🔧 Write an empty settings file
    fileManager.saveFile(
      settingsFile,
      {},
      {
        format: "json",
        silent: true,
      }
    );

    log(`[PluginManager] Created plugin "${safeName}" (${target})`);
    reloadPlugins();
    return { success: true, message: `Plugin "${safeName}" created.` };
  } catch (err) {
    error(
      `[PluginManager] Failed to create plugin "${safeName}":`,
      err.message
    );
    return { success: false, error: err.message };
  }
}

function updatePlugin(name, updates = {}) {
  const safeName = getSafePluginName(name);
  const metaPath = fileManager.joinPath(
    getPluginRoot(),
    safeName,
    "plugin.json"
  );

  if (!fileManager.fileExists(metaPath)) {
    return { success: false, error: `Plugin "${name}" not found.` };
  }

  try {
    const meta = fileManager.loadFile(metaPath, {
      format: "json",
      silent: true,
    });

    const updated = { ...meta, ...updates };
    fileManager.saveFile(metaPath, updated, {
      format: "json",
      silent: true,
    });

    log(`[PluginManager] Updated plugin "${name}" with:`, updates);

    // Update in-memory cache
    pluginRepo[safeName] = {
      ...pluginRepo[safeName],
      ...updates,
    };

    return { success: true };
  } catch (err) {
    error(`[PluginManager] Failed to update plugin "${name}":`, err.message);
    return { success: false, error: err.message };
  }
}

function fetchRemoteContent(url) {
  return new Promise((resolve, reject) => {
    try {
      const req = https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(`Failed to fetch (${res.statusCode}): ${url}`)
          );
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });

      req.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  loadPlugins,
  runPlugin,
  getPluginRoot,
  getPluginCode,
  listPlugins,
  reloadPlugins,
  createPlugin,
  deletePlugin,
  updatePlugin,
  getPluginSettings,
  savePluginSettings,
  fetchRemoteContent,
};
