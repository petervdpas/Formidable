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

    // Drop the obsolete pending_changes field if present in older
    // boot.json files — the journal+cursor pair has replaced it.
    if (Object.prototype.hasOwnProperty.call(result, "pending_changes")) {
      delete result.pending_changes;
      changed = true;
    }

    return { boot: result, changed };
  },
};
