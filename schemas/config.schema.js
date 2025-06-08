// schemas/config.schema.js

module.exports = {
  defaults: {
    theme: "light",
    font_size: 14,
    logging_enabled: true,
    context_mode: "template",
    context_folder: "./",
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

    return { config: repaired, changed };
  },
};
