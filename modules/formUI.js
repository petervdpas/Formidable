// modules/formUI.js

import { EventBus } from "./eventBus.js";
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
    ]);
    currentTemplate = templateYaml;
    clearFormUI(container);
  }

  async function loadFormData(metaData, datafile) {
    currentDatafile = datafile;
    EventBus.emit("logging:default", ["[loadFormData] datafile:", datafile]);

    if (!metaData && currentTemplate?.storage_location && currentDatafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.storage_location,
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

    injectFieldDefaults(currentTemplate.fields, metaData);

    renderFormUI(
      container,
      currentTemplate,
      { ...metaData, _filename: datafile },
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
