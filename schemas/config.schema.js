// schemas/config.schema.js

module.exports = {
  defaults: {
    theme: "light",
    show_icon_buttons: false,
    use_sidebar_expressions: false,
    font_size: 14,
    development_enable: false,
    logging_enabled: false,
    enable_plugins: false,
    context_mode: "template",
    context_folder: "./",
    selected_template: "basic.yaml",
    selected_data_file: "",
    author_name: "unknown",
    author_email: "unknown@example.com",
    encryption_key: "",
    use_git: false,
    git_root: "",
    enable_internal_server: false,
    internal_server_port: 8383,
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
