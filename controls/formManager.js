// controls/formManager.js

const { SingleFileRepository } = require("./sfr");
const fileManager = require("./fileManager");
const metaSchema = require("../schemas/meta.schema");
const { log, warn, error } = require("./nodeLogger");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

function ensureFormDirectory(storageLocation) {
  try {
    const fullPath = fileManager.resolvePath(storageLocation);
    fileManager.ensureDirectory(fullPath, { silent: true });
    log("[FormManager] Ensured form directory:", fullPath);
    return true;
  } catch (err) {
    error("[FormManager] Failed to ensure form directory:", err);
    return false;
  }
}

function listForms(storageLocation) {
  return metaRepo.listFiles(storageLocation);
}

function loadForm(storageLocation, datafile, templateFields = []) {
  try {
    const raw = metaRepo.loadFromBase(storageLocation, datafile);
    if (!raw) return null;

    const sanitized = metaSchema.sanitize(raw, templateFields);
    log("[FormManager] Loaded and sanitized form:", datafile);
    return sanitized;
  } catch (err) {
    error("[FormManager] Failed to load form:", err);
    return null;
  }
}

function saveForm(storageLocation, datafile, data, templateFields = []) {
  try {
    const sanitized = metaSchema.sanitize(data, templateFields);
    const result = metaRepo.saveFromBase(storageLocation, datafile, sanitized);
    if (result.success) {
      log("[FormManager] Saved form:", result.path);
    } else {
      error("[FormManager] Save failed:", result.error);
    }
    return result;
  } catch (err) {
    error("[FormManager] Failed to save form:", err);
    return { success: false, error: err.message };
  }
}

function deleteForm(storageLocation, datafile) {
  return metaRepo.deleteFromBase(storageLocation, datafile);
}

module.exports = {
  ensureFormDirectory,
  listForms,
  loadForm,
  saveForm,
  deleteForm,
};
