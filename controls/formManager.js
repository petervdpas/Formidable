// controls/formManager.js

const { SingleFileRepository } = require("./sfr");
const configManager = require("./configManager");
const fileManager = require("./fileManager");
const metaSchema = require("../schemas/meta.schema");
const { log, warn, error } = require("./nodeLogger");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

function ensureFormDirectory(templateFilename) {
  const storagePath = configManager.getTemplateStoragePath(templateFilename);
  return fileManager.ensureDirectory(storagePath, {
    label: "FormManager",
    silent: true,
  });
}

function listForms(templateFilename) {
  const storagePath = configManager.getTemplateStoragePath(templateFilename);
  return metaRepo.listFiles(storagePath);
}

function loadForm(templateFilename, datafile, templateFields = []) {
  const storagePath = configManager.getTemplateStoragePath(templateFilename);
  try {
    const raw = metaRepo.loadFromBase(storagePath, datafile);
    if (!raw) return null;

    const sanitized = metaSchema.sanitize(raw, templateFields);
    log("[FormManager] Loaded and sanitized form:", datafile);
    return sanitized;
  } catch (err) {
    error("[FormManager] Failed to load form:", err);
    return null;
  }
}

function saveForm(templateFilename, datafile, data, templateFields = []) {
  const storagePath = configManager.getTemplateStoragePath(templateFilename);
  try {
    const sanitized = metaSchema.sanitize(data, templateFields);
    const result = metaRepo.saveFromBase(storagePath, datafile, sanitized);
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

function deleteForm(templateFilename, datafile) {
  const storagePath = configManager.getTemplateStoragePath(templateFilename);
  return metaRepo.deleteFromBase(storagePath, datafile);
}

module.exports = {
  ensureFormDirectory,
  listForms,
  loadForm,
  saveForm,
  deleteForm,
};
