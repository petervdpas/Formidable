// schemas/config.schema.js

module.exports = {
  defaults: {
    theme: "light",
    show_icon_buttons: false,
    use_expressions: false,
    show_meta_section: true,
    loop_state_collapsed: false,
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
    language: "en",
    encryption_key: "",
    use_git: false,
    git_root: "",
    enable_internal_server: false,
    internal_server_port: 8383,
    window_bounds: {
      width: 1024,
      height: 800,
    },
    template_sidebar_width: 300,
    storage_sidebar_width: 300,
    status_buttons: {
      charpicker: true,
      gitquick: true,
    },
  },

  sanitize(raw) {
    const deepMerge = (defaults, rawVal) => {
      if (typeof defaults !== "object" || defaults === null) {
        return rawVal !== undefined ? rawVal : defaults;
      }
      const result = Array.isArray(defaults) ? [...defaults] : { ...defaults };
      for (const key in defaults) {
        result[key] =
          rawVal && rawVal[key] !== undefined
            ? deepMerge(defaults[key], rawVal[key])
            : defaults[key];
      }
      return result;
    };

    const repaired = {};
    let changed = false;

    for (const key in this.defaults) {
      if (raw[key] === undefined) {
        repaired[key] = this.defaults[key];
        changed = true;
      } else {
        const merged = deepMerge(this.defaults[key], raw[key]);
        if (merged !== raw[key]) changed = true;
        repaired[key] = merged;
      }
    }

    return { config: repaired, changed };
  },
};
