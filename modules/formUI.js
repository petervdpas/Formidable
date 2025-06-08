// modules/formUI.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { renderFormUI } from "./formRenderer.js";
import { saveForm, deleteForm, renderFormPreview } from "./formActions.js";
import { injectFieldDefaults, clearFormUI } from "../utils/formUtils.js";

export function createFormManager(containerId) {
  const container = document.getElementById(containerId);

  let currentTemplate = null;
  let currentDatafile = null;

  if (!container) {
    EventBus.emit("logging:error", [
      "[createFormManager] Form container not found:",
      containerId,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    "[createFormManager] Initialized with container:",
    containerId,
  ]);

  async function loadTemplate(templateYaml) {
    if (!templateYaml) {
      EventBus.emit("logging:warning", [
        "[createFormManager:loadTemplate] received null",
      ]);
      return;
    }

    EventBus.emit("logging:default", [
      "[createFormManager:loadTemplate] Loading template:",
      templateYaml.name,
      "→ filename:",
      templateYaml.filename || "<missing>",
    ]);

    currentTemplate = ensureVirtualLocation(templateYaml);
    clearFormUI(container);
  }

  async function loadFormData(metaData, datafile) {
    currentDatafile = datafile;
    EventBus.emit("logging:default", ["[loadFormData] datafile:", datafile]);

    if (!metaData && currentTemplate?.virtualLocation && currentDatafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.virtualLocation,
        currentDatafile,
        currentTemplate.fields || []
      );
      EventBus.emit("logging:default", [
        "[loadFormData] loaded metaData from API:",
        metaData,
      ]);
    }

    metaData ||= {};
    if (!metaData) {
      EventBus.emit("logging:warning", [
        "[loadFormData] No metadata available",
      ]);
      return;
    }

    const formData = metaData.data || metaData;
    injectFieldDefaults(currentTemplate.fields, formData);

    renderFormUI(
      container,
      currentTemplate,
      { ...formData, _filename: datafile, meta: metaData.meta },
      () => saveForm(container, currentTemplate),
      (filename) => deleteForm(container, currentTemplate, filename),
      () => renderFormPreview(container, currentTemplate)
    );
  }

  return {
    loadTemplate,
    loadFormData,
    saveForm: () => saveForm(container, currentTemplate),
    clearForm: () => {
      currentDatafile = null;
      clearFormUI(container);
    },
  };
}
