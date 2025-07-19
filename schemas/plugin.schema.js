// schemas/plugin.schema.js

module.exports = {
  defaults: {
    name: "",
    version: "1.0.0",
    description: "",
    author: "Unknown",
    tags: [],
    enabled: true,
    run: null,
    target: "backend",
    ipc: {},
  },

  sanitize(raw = {}, pluginName = "unnamed") {
    const plugin = { ...this.defaults, ...raw };

    plugin.name = plugin.name || pluginName;
    plugin.version = typeof plugin.version === "string" ? plugin.version : "1.0.0";
    plugin.description = typeof plugin.description === "string" ? plugin.description : "";
    plugin.author = typeof plugin.author === "string" ? plugin.author : "Unknown";

    if (!Array.isArray(plugin.tags)) plugin.tags = [];
    plugin.enabled = raw.enabled !== false;

    // Validate IPC map
    if (typeof plugin.ipc !== "object" || plugin.ipc === null) {
      plugin.ipc = {};
    }

    for (const key of Object.keys(plugin.ipc)) {
      if (typeof plugin.ipc[key] !== "string") {
        throw new Error(`[plugin.schema] Invalid IPC handler for "${key}" in plugin "${plugin.name}"`);
      }
    }

    // Require run() for backend plugins
    if (
      typeof plugin.run !== "function" &&
      plugin.target !== "frontend"
    ) {
      throw new Error(`[plugin.schema] Plugin "${plugin.name}" is missing a valid run() function`);
    }

    return plugin;
  },
};
