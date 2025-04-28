// modules/sfr.js

const fs = require("fs");
const path = require("path");
const { log, warn, error } = require("./nodeLogger");

class SingleFileRepository {
  constructor({ defaultExtension = ".meta.json", defaultJson = true, silent = false } = {}) {
    this.defaultExtension = defaultExtension;
    this.defaultJson = defaultJson;
    this.silent = silent;
  }

  getStoragePath(directory, baseFilename, { extension } = {}) {
    const finalExtension = extension || this.defaultExtension;
    const filenameWithoutMd = baseFilename.replace(/\.md$/, "");
    return path.join(directory, filenameWithoutMd + finalExtension);
  }

  saveFile(filePath, data, { json = this.defaultJson, silent = this.silent, transform } = {}) {
    try {
      const finalData = typeof transform === "function" ? transform(data) : data;
      const content = json ? JSON.stringify(finalData, null, 2) : finalData;
      fs.writeFileSync(filePath, content, "utf-8");
      if (!silent) log("[SFR] Saved:", filePath);
      return { success: true, path: filePath };
    } catch (err) {
      if (!silent) error("[SFR] Failed to save:", err);
      return { success: false, error: err.message };
    }
  }

  loadFile(filePath, { json = this.defaultJson, silent = this.silent, transform } = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        if (!silent) warn("[SFR] File not found:", filePath);
        return null;
      }
      let content = fs.readFileSync(filePath, "utf-8");
      if (json) {
        content = JSON.parse(content);
      }
      if (typeof transform === "function") {
        content = transform(content);
      }
      if (!silent) log("[SFR] Loaded:", filePath);
      return content;
    } catch (err) {
      if (!silent) error("[SFR] Failed to load:", err);
      return null;
    }
  }

  saveMetadata(directory, markdownFilename, data) {
    const metaPath = this.getStoragePath(directory, markdownFilename);
    return this.saveFile(metaPath, data);
  }

  loadMetadata(directory, markdownFilename) {
    const metaPath = this.getStoragePath(directory, markdownFilename);
    return this.loadFile(metaPath);
  }
}

module.exports = { SingleFileRepository };
