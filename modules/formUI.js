// modules/formUI.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { renderFormUI } from "./formRenderer.js";
import { saveForm, deleteForm, renderFormPreview } from "./formActions.js";
import { injectFieldDefaults, clearContainerUI } from "../utils/formUtils.js";

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

    currentTemplate = await ensureVirtualLocation(templateYaml);
    clearContainerUI(
      container,
      "sidebar.templates.placeholder",
      "Select or create a template-file to begin."
    );
  }

  async function loadFormData(metaData, datafile) {
    currentDatafile = datafile;
    EventBus.emit("logging:default", ["[loadFormData] datafile:", datafile]);

    if (!metaData && currentTemplate?.virtualLocation && currentDatafile) {
      metaData = await new Promise((resolve) => {
        EventBus.emit(
          "form:load",
          {
            templateFilename: currentTemplate.filename,
            datafile: currentDatafile,
            fields: currentTemplate.fields || [],
          },
          resolve
        );
      });

      EventBus.emit("logging:default", [
        "[loadFormData] loaded metaData from EventBus:",
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

    await renderFormUI(
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
      clearContainerUI(
        container,
        "sidebar.forms.placeholder",
        "Select or create a form-file to begin."
      );
    },
  };
}
