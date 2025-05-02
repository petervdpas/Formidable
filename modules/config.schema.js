// modules/config.schema.js

module.exports = {
  defaults: {
    recent_templates: ["basic.yaml"],
    last_opened_markdown: { "basic.yaml": "" },
    selected_template: "basic.yaml",
    theme: "light",
    font_size: 14,
    context_mode: "template",
    default_markdown_dir: "./markdowns",
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
