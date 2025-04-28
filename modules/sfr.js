// modules/sfr.js

const fs = require("fs");
const path = require("path");
const { log, warn, error } = require("./nodeLogger");

function getMetaPath(directory, markdownFilename) {
  return path.join(directory, markdownFilename.replace(/\.md$/, ".meta.json"));
}

function saveMetadata(directory, markdownFilename, data) {
  try {
    const metaPath = getMetaPath(directory, markdownFilename);
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2), "utf-8");
    log("[SFR] Saved metadata:", metaPath);
    return { success: true, path: metaPath };
  } catch (err) {
    error("[SFR] Failed to save metadata:", err);
    return { success: false, error: err.message };
  }
}

function loadMetadata(directory, markdownFilename) {
  try {
    const metaPath = getMetaPath(directory, markdownFilename);
    if (!fs.existsSync(metaPath)) {
      warn("[SFR] Metadata file not found:", metaPath);
      return null;
    }
    const content = fs.readFileSync(metaPath, "utf-8");
    log("[SFR] Loaded metadata:", metaPath);
    return JSON.parse(content);
  } catch (err) {
    error("[SFR] Failed to load metadata:", err);
    return null;
  }
}

module.exports = {
  saveMetadata,
  loadMetadata,
};
