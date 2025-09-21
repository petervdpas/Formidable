// modules/formUI.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { renderFormUI } from "./formRenderer.js";
import { saveForm, deleteForm, renderFormPreview } from "./formActions.js";
import { clearContainerUI } from "../utils/formUtils.js";

const BOUND_FLAG = "__boundFormSaved";

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

  // Bind once per container: live “updated/tags” UI refresh after save.
  if (!container[BOUND_FLAG]) {
    EventBus.on("form:saved", (e) => {
      if (!e || e.filename !== currentDatafile) return;
      if (
        e.template &&
        currentTemplate?.filename &&
        e.template !== currentTemplate.filename
      )
        return;

      queueMicrotask(() => {
        const section = container.querySelector("#storage-meta");
        if (!section) return;

        const updatedNode = section.querySelector(
          '[data-i18n-key="standard.updated"], .meta-updated, [data-meta="updated"]'
        );
        if (updatedNode && e.updated) updatedNode.textContent = e.updated;

        const tagsNode = section.querySelector(
          '[data-i18n-key="standard.tags"], .meta-tags, [data-meta="tags"]'
        );
        if (tagsNode && Array.isArray(e.tags) && e.tags.length) {
          tagsNode.textContent = e.tags.join(", ");
        }

        const updatedHidden = container.querySelector(
          'input[name="meta-updated"]'
        );
        if (updatedHidden && e.updated) updatedHidden.value = e.updated;
      });
    });
    container[BOUND_FLAG] = true;
  }

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
      "special.storage.placeholder",
      "Select or create a storage-file to begin."
    );
  }

  async function loadFormData(metaData, datafile) {
    currentDatafile = datafile;

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
    }

    metaData ||= {};
    if (!metaData) {
      EventBus.emit("logging:warning", [
        "[loadFormData] No metadata available",
      ]);
      return;
    }

    const formData = metaData.data || metaData;

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
        "special.storage.placeholder",
        "Select or create a storage-file to begin."
      );
    },
  };
}
