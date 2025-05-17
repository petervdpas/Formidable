// controls/markdownManager.js

const { SingleFileRepository } = require("./sfr");
const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function ensureMarkdownDirectory(storageLocation) {
  try {
    const fullPath = fileManager.resolvePath(storageLocation);
    fileManager.ensureDirectory(fullPath, { silent: true });
    log("[MarkdownManager] Ensured markdown directory:", fullPath);
    return true;
  } catch (err) {
    error("[MarkdownManager] Failed to ensure directory:", err);
    return false;
  }
}

function listMarkdownFiles(storageLocation) {
  return markdownRepo.listFiles(storageLocation);
}

function loadMarkdownFile(storageLocation, filename) {
  return markdownRepo.loadFromBase(storageLocation, filename);
}

function saveMarkdownFile(storageLocation, filename, content, options = {}) {
  return markdownRepo.saveFromBase(storageLocation, filename, content, options);
}

function deleteMarkdownFile(storageLocation, filename) {
  return markdownRepo.deleteFromBase(storageLocation, filename);
}

module.exports = {
  ensureMarkdownDirectory,
  listMarkdownFiles,
  loadMarkdownFile,
  saveMarkdownFile,
  deleteMarkdownFile,
};
