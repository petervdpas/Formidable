// modules/formManager.js

const { SingleFileRepository } = require("./sfr");
const fileManager = require("./fileManager");
const metaSchema = require("./meta.schema");
const { log, warn, error } = require("./nodeLogger");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

function ensureFormDirectory(markdownDir) {
  try {
    const fullPath = fileManager.resolvePath(markdownDir);
    fileManager.ensureDirectory(fullPath, { silent: true });
    log("[FormManager] Ensured form directory:", fullPath);
    return true;
  } catch (err) {
    error("[FormManager] Failed to ensure form directory:", err);
    return false;
  }
}

function listForms(markdownDir) {
  return metaRepo.listFiles(markdownDir);
}

function loadForm(markdownDir, filename, templateFields = []) {
  try {
    const raw = metaRepo.loadFromBase(markdownDir, filename);
    if (!raw) {
      warn("[FormManager] No data loaded.");
      return null;
    }
    const sanitized = metaSchema.sanitize(raw, templateFields);
    return sanitized;
  } catch (err) {
    error("[FormManager] Failed to load form:", err);
    return null;
  }
}

function saveForm(markdownDir, filename, data) {
  return metaRepo.saveFromBase(markdownDir, filename, data);
}

function deleteForm(markdownDir, filename) {
  return metaRepo.deleteFromBase(markdownDir, filename);
}

module.exports = {
  ensureFormDirectory,
  listForms,
  loadForm,
  saveForm,
  deleteForm,
};
