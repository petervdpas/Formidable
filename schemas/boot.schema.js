// schemas/boot.schema.js

module.exports = {
  defaults: {
    active_profile: "user.json",
  },

  sanitize(raw) {
    const result = { ...this.defaults, ...raw };
    let changed = false;

    for (const key in this.defaults) {
      if (raw[key] === undefined) {
        changed = true;
        result[key] = this.defaults[key];
      }
    }

    return { boot: result, changed };
  },
};
