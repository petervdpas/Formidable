const fs = require('fs');
const path = require('path');
const { log, error } = require('./nodeLogger'); // Optional: Your existing logger

const pluginRepo = {}; // Loaded plugins stored here

// Load all plugins from a given directory
function loadPlugins(pluginDir) {
  if (!fs.existsSync(pluginDir)) {
    error("[PluginManager] Plugin directory not found:", pluginDir);
    return;
  }

  const files = fs.readdirSync(pluginDir).filter(file => file.endsWith(".js"));
  log(`[PluginManager] Found ${files.length} plugin(s).`);

  for (const file of files) {
    const fullPath = path.join(pluginDir, file);

    try {
      const code = fs.readFileSync(fullPath, 'utf-8');
      const pluginName = path.basename(file, ".js");

      const pluginFunction = new Function("context", code + "; return runPlugin(context);");

      pluginRepo[pluginName] = pluginFunction;
      log(`[PluginManager] Loaded plugin: ${pluginName}`);
    } catch (err) {
      error(`[PluginManager] Failed to load plugin ${file}:`, err.message);
    }
  }
}

// Run a plugin by name with a given context
function runPlugin(name, context = {}) {
  const pluginFunc = pluginRepo[name];

  if (!pluginFunc) {
    error(`[PluginManager] Plugin not found: ${name}`);
    return null;
  }

  try {
    const result = pluginFunc(context);
    log(`[PluginManager] Plugin ${name} executed successfully.`);
    return result;
  } catch (err) {
    error(`[PluginManager] Plugin ${name} crashed:`, err.message);
    return null;
  }
}

// List available plugins
function listPlugins() {
  return Object.keys(pluginRepo);
}

// Full reload if you add/remove plugins dynamically
function reloadPlugins(pluginDir) {
  for (const key of Object.keys(pluginRepo)) {
    delete pluginRepo[key];
  }
  loadPlugins(pluginDir);
}

module.exports = {
  loadPlugins,
  runPlugin,
  listPlugins,
  reloadPlugins,
};
