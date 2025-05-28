// modules/formUI.js

import { EventBus } from "./eventBus.js";
import {
  getFormData,
  validateFilenameInput,
  injectFieldDefaults,
  clearFormUI,
} from "../utils/formUtils.js";
import { applyFieldValues, focusFirstInput } from "../utils/domUtils.js";
import { renderForm } from "./formRenderer.js";
import { showConfirmModal, setupRenderModal } from "./modalSetup.js";
import {
  createFormSaveButton,
  createFormDeleteButton,
  createFormRenderButton,
} from "./uiButtons.js";

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

    clearFormUI(container); // Don't render fields yet—wait for metadata
  }

  async function loadFormData(metaData, datafile) {
    currentDatafile = datafile;

    EventBus.emit("logging:default", [
      "[createFormManager:loadFormData] datafile:",
      currentDatafile,
    ]);

    // Load from file if needed
    if (!metaData && currentTemplate?.storage_location && currentDatafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.storage_location,
        currentDatafile,
        currentTemplate.fields || []
      );
      EventBus.emit("logging:default", [
        "[createFormManager:loadFormData] loaded metaData from API:",
        metaData,
      ]);
    }

    // 🩹 Ensure metaData is at least an empty object
    metaData = metaData || {};

    if (!metaData) {
      EventBus.emit("logging:warning", [
        "[createFormManager:loadFormData] No metadata available.",
      ]);
      return;
    }

    const isNewEntry = Object.keys(metaData).length === 0;

    // Inject defaults before rendering
    if (isNewEntry) {
      injectFieldDefaults(currentTemplate.fields, metaData);
    }

    // Now render the form
    container.innerHTML = "";
    renderForm(container, currentTemplate);

    // 🛠 Restore datafile into the input field
    const filenameInput = container.querySelector("#meta-json-filename");
    if (filenameInput) {
      filenameInput.value = datafile;
    }

    // Setup buttons directly here
    const saveBtn = createFormSaveButton(() => saveForm());
    const deleteBtn = createFormDeleteButton(() => deleteForm(currentDatafile));
    const renderBtn = createFormRenderButton(() => renderFormPreview());

    const group = document.createElement("div");
    group.className = "button-group";
    group.append(saveBtn, deleteBtn, renderBtn);
    container.appendChild(group);

    EventBus.emit("logging:default", ["[FormButtons] Buttons initialized."]);

    applyFieldValues(container, currentTemplate, metaData);
    focusFirstInput(container);
  }

  async function saveForm() {
    EventBus.emit("logging:default", [
      "[createFormManager:saveForm] Save triggered.",
    ]);

    if (!currentTemplate || !currentTemplate.storage_location) {
      EventBus.emit("logging:warning", [
        "[createFormManager:saveForm] No template selected.",
      ]);
      EventBus.emit("status:update", "No template selected.");
      return;
    }

    const formData = await getFormData(container, currentTemplate);
    const datafileInput = container.querySelector("#meta-json-filename");
    const datafile = validateFilenameInput(datafileInput);

    if (!datafile) {
      EventBus.emit("logging:warning", [
        "[createFormManager:saveForm] No datafile provided.",
      ]);
      EventBus.emit("status:update", "Please enter a filename for datafile.");
      return;
    }

    const storageLocation = currentTemplate.storage_location;
    const saveResult = await window.api.forms.saveForm(
      storageLocation,
      datafile,
      formData,
      currentTemplate.fields || []
    );

    if (saveResult.success) {
      EventBus.emit("status:update", `Saved metadata: ${saveResult.path}`);
      EventBus.emit("form:list:reload");
      setTimeout(() => {
        EventBus.emit("form:list:highlighted", datafile);
      }, 500);
    } else {
      EventBus.emit("logging:error", [
        "[createFormManager:saveForm] Save failed:",
        saveResult.error,
      ]);
      EventBus.emit(
        "status:update",
        `Failed to save metadata: ${saveResult.error}`
      );
    }
  }

  async function deleteForm(datafile) {
    if (!currentTemplate || !currentTemplate.storage_location) {
      EventBus.emit("logging:warning", [
        "[createFormManager:deleteForm] No template selected for deletion.",
      ]);
      EventBus.emit("status:update", "Cannot delete: template not selected.");
      return;
    }

    const confirmed = await showConfirmModal(
      `Are you sure you want to delete "${datafile}"?`,
      {
        okText: "Delete",
        cancelText: "Cancel",
        width: "auto",
        height: "auto",
      }
    );
    if (!confirmed) return;

    const result = await window.api.forms.deleteForm(
      currentTemplate.storage_location,
      datafile
    );

    if (result) {
      EventBus.emit("status:update", `Deleted: ${datafile}`);
      EventBus.emit("form:list:reload");
      clearFormUI(container);
    } else {
      EventBus.emit("logging:error", [
        "[createFormManager:deleteForm] Deletion failed.",
      ]);
      EventBus.emit("status:update", "Failed to delete metadata file.");
    }
  }

  async function renderFormPreview() {
    const renderModal = setupRenderModal();

    EventBus.emit("logging:default", ["[Render] Collecting form data..."]);
    const formData = await getFormData(container, currentTemplate);

    EventBus.emit("logging:default", ["[Render] Rendering Markdown..."]);
    const markdown = await window.api.transform.renderMarkdownTemplate(
      formData,
      currentTemplate
    );
    document.getElementById("render-output").textContent = markdown;

    EventBus.emit("logging:default", ["[Render] Rendering HTML preview..."]);
    const html = await window.api.transform.renderHtmlPreview(markdown);
    document.getElementById("render-preview").innerHTML = html;

    const copyMarkdownBtn = document.getElementById("copy-markdown");
    const copyPreviewBtn = document.getElementById("copy-preview");

    if (copyMarkdownBtn) {
      copyMarkdownBtn.onclick = () =>
        navigator.clipboard
          .writeText(markdown)
          .then(() =>
            EventBus.emit("ui:toast", {
              message: "Markdown copied",
              variant: "success",
            })
          )
          .catch((err) => {
            EventBus.emit("logging:error", ["Markdown copy failed", err]);
            EventBus.emit("ui:toast", {
              message: "Failed to copy Markdown",
              variant: "error",
            });
          });
    }

    if (copyPreviewBtn) {
      copyPreviewBtn.onclick = () =>
        navigator.clipboard
          .writeText(html)
          .then(() =>
            EventBus.emit("ui:toast", {
              message: "HTML copied",
              variant: "success",
            })
          )
          .catch((err) => {
            EventBus.emit("logging:error", ["HTML copy failed", err]);
            EventBus.emit("ui:toast", {
              message: "Failed to copy HTML",
              variant: "error",
            });
          });
    }

    EventBus.emit("logging:default", ["[Render] Showing render modal..."]);
    renderModal.show();
  }

  return {
    loadTemplate,
    loadFormData,
    saveForm,
    clearForm: () => {
      currentDatafile = null;
      clearFormUI(container);
    },
  };
}
