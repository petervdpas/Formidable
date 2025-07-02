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
    target: "backend", // ensure target is defaulted
  },

  sanitize(raw = {}, pluginName = "unnamed") {
    const plugin = { ...this.defaults, ...raw };

    plugin.name = plugin.name || pluginName;
    plugin.version = typeof plugin.version === "string" ? plugin.version : "1.0.0";
    plugin.description = typeof plugin.description === "string" ? plugin.description : "";
    plugin.author = typeof plugin.author === "string" ? plugin.author : "Unknown";

    if (!Array.isArray(plugin.tags)) plugin.tags = [];
    plugin.enabled = raw.enabled !== false;

    // 🧠 Important fix:
    // Allow frontend plugins to skip defining run()
    if (
      typeof plugin.run !== "function" &&
      plugin.target !== "frontend"
    ) {
      throw new Error(`[plugin.schema] Plugin "${pluginName}" is missing a valid run() function`);
    }

    return plugin;
  },
};