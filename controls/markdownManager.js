// controls/markdownManager.js

const { SingleFileRepository } = require("./sfr");
const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function ensureMarkdownDirectory(markdownDir) {
  try {
    const fullPath = fileManager.resolvePath(markdownDir);
    fileManager.ensureDirectory(fullPath, { silent: true });
    log("[MarkdownManager] Ensured markdown directory:", fullPath);
    return true;
  } catch (err) {
    error("[MarkdownManager] Failed to ensure directory:", err);
    return false;
  }
}

function listMarkdownFiles(markdownDir) {
  return markdownRepo.listFiles(markdownDir);
}

function loadMarkdownFile(markdownDir, filename) {
  return markdownRepo.loadFromBase(markdownDir, filename);
}

function saveMarkdownFile(markdownDir, filename, content, options = {}) {
  return markdownRepo.saveFromBase(markdownDir, filename, content, options);
}

function deleteMarkdownFile(markdownDir, filename) {
  return markdownRepo.deleteFromBase(markdownDir, filename);
}

module.exports = {
  ensureMarkdownDirectory,
  listMarkdownFiles,
  loadMarkdownFile,
  saveMarkdownFile,
  deleteMarkdownFile,
};
