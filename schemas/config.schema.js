// modules/config.schema.js

module.exports = {
  defaults: {
    theme: "light",
    font_size: 14,
    context_mode: "template",
    storage_location: "./storage",
    selected_template: "basic.yaml",
    selected_data_file: "",
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

    return { config: repaired, changed };
  },
};
