// modules/formUI.js

import { EventBus } from "./eventBus.js";
import { buildReadOnlyInput } from "../utils/elementBuilders.js";
import { showConfirmModal, setupRenderModal } from "./modalSetup.js";
import {
  getFormData,
  renderFieldElement,
  validateFilenameInput,
  injectFieldDefaults,
  clearFormUI,
} from "../utils/formUtils.js";
import {
  applyFieldValues,
  focusFirstInput,
  copyToClipboard,
} from "../utils/domUtils.js";
import {
  createFormSaveButton,
  createFormDeleteButton,
  createFormRenderButton,
  createCopyMarkdownButton,
  createCopyPreviewButton,
  buildButtonGroup,
} from "./uiButtons.js";

// loggers for shorter syntax
const log = (...args) => EventBus.emit("logging:default", args);
const warn = (...args) => EventBus.emit("logging:warning", args);
const err = (...args) => EventBus.emit("logging:error", args);

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
    log("[loadFormData] datafile:", currentDatafile);

    if (!metaData && currentTemplate?.storage_location && currentDatafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.storage_location,
        currentDatafile,
        currentTemplate.fields || []
      );
      log("[loadFormData] loaded metaData from API:", metaData);
    }

    metaData ||= {};
    if (!metaData) return warn("[loadFormData] No metadata available");

    if (Object.keys(metaData).length === 0) {
      injectFieldDefaults(currentTemplate.fields, metaData);
    }

    container.innerHTML = "";

    // Filename row
    const filenameRow = buildReadOnlyInput(
      "meta-json-filename",
      "readonly-input",
      "Filename",
      datafile
    );
    container.appendChild(filenameRow);

    // Fields
    // const fieldElements = {};
    const fields = currentTemplate.fields || [];
    fields.forEach((field) => {
      const row = renderFieldElement(field);
      if (row) {
        container.appendChild(row);
        // fieldElements[field.key] = row.querySelector(`[name="${field.key}"]`);
      }
    });

    // Buttons
    const saveBtn = createFormSaveButton(() => saveForm());
    const deleteBtn = createFormDeleteButton(() => deleteForm(currentDatafile));
    const renderBtn = createFormRenderButton(() => renderFormPreview());

    container.appendChild(buildButtonGroup(saveBtn, deleteBtn, renderBtn));

    log("[FormButtons] Buttons initialized.");
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

    log("[Render] Collecting form data...");
    const formData = await getFormData(container, currentTemplate);
    if (!formData || typeof formData !== "object") {
      err("[Render] Invalid formData:", formData);
      return;
    }

    log("[Render] Rendering Markdown...");
    const markdown = await window.api.transform.renderMarkdownTemplate(
      formData,
      currentTemplate
    );
    document.getElementById("render-output").textContent = markdown;

    log("[Render] Rendering HTML preview...");
    const html = await window.api.transform.renderHtmlPreview(markdown);
    document.getElementById("render-preview").innerHTML = html;

    // 🔁 Dynamisch knoppen toevoegen
    const markdownWrapper = document.getElementById(
      "copy-markdown-button-wrapper"
    );
    const previewWrapper = document.getElementById(
      "copy-preview-button-wrapper"
    );

    markdownWrapper.innerHTML = "";
    previewWrapper.innerHTML = "";

    const markdownBtn = createCopyMarkdownButton();
    const previewBtn = createCopyPreviewButton();

    copyToClipboard(markdownBtn, () => markdown, "Markdown");
    copyToClipboard(previewBtn, () => html, "HTML");

    markdownWrapper.appendChild(markdownBtn);
    previewWrapper.appendChild(previewBtn);

    log("[Render] Showing render modal...");
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
