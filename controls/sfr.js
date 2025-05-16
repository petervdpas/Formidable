// controls/sfr.js

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
    const ext = extension || this.defaultExtension;

    let base = baseFilename;
    if (base.endsWith(".md")) base = base.slice(0, -3);
    if (base.endsWith(ext)) base = base.slice(0, -ext.length);

    const resolvedDir = fileManager.resolvePath(directory);
    return fileManager.buildFilePath(resolvedDir, base, { extension: ext });
  }

  listFiles(directory, extension = this.defaultExtension) {
    try {
      const resolvedDir = fileManager.resolvePath(directory);
      const files = fileManager.listFilesByExtension(resolvedDir, extension, {
        silent: this.silent,
      });
      if (!this.silent)
        log("[SFR] Listed", files.length, "files in", directory);
      return files;
    } catch (err) {
      if (!this.silent) error("[SFR] Failed to list files:", err);
      return [];
    }
  }

  saveFile(filePath, data, { json = this.defaultJson, transform = null } = {}) {
    try {
      const processed =
        typeof transform === "function" ? transform(data) : data;
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

  saveFromBase(directory, baseFilename, data, opts = {}) {
    const filePath = this.getStoragePath(directory, baseFilename, opts);
    return this.saveFile(filePath, data, opts);
  }

  loadFromBase(directory, baseFilename, opts = {}) {
    const filePath = this.getStoragePath(directory, baseFilename, opts);
    return this.loadFile(filePath, opts);
  }

  deleteFromBase(directory, baseFilename, opts = {}) {
    const filePath = this.getStoragePath(directory, baseFilename, opts);
    return fileManager.deleteFile(filePath, { silent: this.silent });
  }
}

module.exports = { SingleFileRepository };
