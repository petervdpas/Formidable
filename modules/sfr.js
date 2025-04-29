// modules/sfr.js

const path = require("path");
const { log, warn, error } = require("./nodeLogger");
const fileManager = require("./fileManager");

class SingleFileRepository {
  constructor({
    defaultExtension = ".meta.json",
    defaultJson = true,
    silent = false,
  } = {}) {
    this.defaultExtension = defaultExtension;
    this.defaultJson = defaultJson;
    this.silent = silent;
  }

    // This is the domain-aware filename logic (e.g., strip .md)
  getStoragePath(directory, baseFilename, { extension } = {}) {
    const name = baseFilename.replace(/\.md$/, ""); // <-- Domain-specific
    return fileManager.buildFilePath(directory, name, { extension: extension || this.defaultExtension });
  }

  saveFile(filePath, data, { json = this.defaultJson, transform = null } = {}) {
    try {
      const processed = typeof transform === "function" ? transform(data) : data;
      const format = json ? "json" : "text";

      const ok = fileManager.saveFile(filePath, processed, {
        format,
        silent: true, // 🔇 suppress lower-level logs
      });

      if (!ok) {
        if (!this.silent) error("[SFR] Failed to save file:", filePath);
        return { success: false, error: "Save failed" };
      }

      if (!this.silent) log("[SFR] Saved:", filePath);
      return { success: true, path: filePath };
    } catch (err) {
      if (!this.silent) error("[SFR] Save error:", err);
      return { success: false, error: err.message };
    }
  }

  loadFile(filePath, { json = this.defaultJson, transform = null } = {}) {
    try {
      const format = json ? "json" : "text";
      const raw = fileManager.loadFile(filePath, {
        format,
        silent: true,
      });

      const result = typeof transform === "function" ? transform(raw) : raw;

      if (!this.silent) log("[SFR] Loaded:", filePath);
      return result;
    } catch (err) {
      if (!this.silent) warn("[SFR] Failed to load:", err.message);
      return null;
    }
  }

  saveMetadata(directory, markdownFilename, data) {
    const filePath = this.getStoragePath(directory, markdownFilename);
    return this.saveFile(filePath, data);
  }

  loadMetadata(directory, markdownFilename) {
    const filePath = this.getStoragePath(directory, markdownFilename);
    return this.loadFile(filePath);
  }
}

module.exports = { SingleFileRepository };
