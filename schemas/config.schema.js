// schemas/config.schema.js

module.exports = {
  defaults: {
    theme: "light",
    font_size: 14,
    logging_enabled: true,
    context_mode: "template",
    context_folder: "./",

    // Deprecated — will (going to) be ignored in code logic
    templates_location: "./templates", // deprecated
    storage_location: "./storage", // deprecated

    selected_template: "basic.yaml",
    selected_data_file: "",
    author_name: "unknown",
    author_email: "unknown@example.com",
    window_bounds: {
      width: 1024,
      height: 800,
    },
  },

  sanitize(raw) {
    const config = { ...this.defaults, ...raw };
    const repaired = {};
    let changed = false;

    for (const key in this.defaults) {
      if (raw[key] === undefined) {
        repaired[key] = this.defaults[key];
        changed = true;
      } else {
        repaired[key] = raw[key];
      }
    }

    // DO NOT DELETE deprecated keys yet — just mark them in comments and ignore them in logic
    // Leave them present in `repaired` to allow inspection and backward compatibility

    // delete repaired.templates_location;
    // delete repaired.storage_location;

    return { config: repaired, changed };
  },
};
