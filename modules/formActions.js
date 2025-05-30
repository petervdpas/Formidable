// modules/formActions.js

import { EventBus } from "./eventBus.js";
import {
  getFormData,
  validateFilenameInput,
  clearFormUI,
} from "../utils/formUtils.js";
import { showConfirmModal, setupRenderModal } from "./modalSetup.js";
import { copyToClipboard } from "../utils/domUtils.js";
import {
  createCopyMarkdownButton,
  createCopyPreviewButton,
} from "./uiButtons.js";

const log = (...args) => EventBus.emit("logging:default", args);
const warn = (...args) => EventBus.emit("logging:warning", args);
const err = (...args) => EventBus.emit("logging:error", args);

export async function saveForm(container, template) {
  EventBus.emit("logging:default", ["[saveForm] Save triggered."]);

  if (!template || !template.storage_location) {
    warn("[saveForm] No template selected.");
    EventBus.emit("status:update", "No template selected.");
    return;
  }

  const formData = await getFormData(container, template);
  const datafileInput = container.querySelector("#meta-json-filename");
  const datafile = validateFilenameInput(datafileInput);

  if (!datafile) {
    warn("[saveForm] No datafile provided.");
    EventBus.emit("status:update", "Please enter a filename for datafile.");
    return;
  }

  const storageLocation = template.storage_location;
  const saveResult = await window.api.forms.saveForm(
    storageLocation,
    datafile,
    formData,
    template.fields || []
  );

  if (saveResult.success) {
    EventBus.emit("status:update", `Saved metadata: ${saveResult.path}`);
    EventBus.emit("form:list:reload");

    setTimeout(() => {
      EventBus.emit("form:list:highlighted", datafile);
    }, 500);

    const newMeta = await window.api.forms.loadForm(
      storageLocation,
      datafile,
      template.fields || []
    );

    const { renderFormUI } = await import("./formRenderer.js");
    renderFormUI(
      container,
      template,
      Object.assign(newMeta, { _filename: datafile }),
      () => saveForm(container, template),
      (filename) => deleteForm(container, template, filename),
      () => renderFormPreview(container, template)
    );
  } else {
    err("[saveForm] Save failed:", saveResult.error);
    EventBus.emit(
      "status:update",
      `Failed to save metadata: ${saveResult.error}`
    );
  }
}

export async function deleteForm(container, template, datafile) {
  if (!template || !template.storage_location) {
    warn("[deleteForm] No template selected for deletion.");
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
    template.storage_location,
    datafile
  );

  if (result) {
    EventBus.emit("status:update", `Deleted: ${datafile}`);
    EventBus.emit("form:list:reload");
    clearFormUI(container);
  } else {
    err("[deleteForm] Deletion failed.");
    EventBus.emit("status:update", "Failed to delete metadata file.");
  }
}

export async function renderFormPreview(container, template) {
  const renderModal = setupRenderModal();

  log("[Render] Collecting form data...");
  const formData = await getFormData(container, template);
  if (!formData || typeof formData !== "object") {
    err("[Render] Invalid formData:", formData);
    return;
  }

  log("[Render] Rendering Markdown...");
  const markdown = await window.api.transform.renderMarkdownTemplate(
    formData,
    template
  );
  document.getElementById("render-output").textContent = markdown;

  log("[Render] Rendering HTML preview...");
  const html = await window.api.transform.renderHtmlPreview(markdown);
  document.getElementById("render-preview").innerHTML = html;

  const markdownWrapper = document.getElementById(
    "copy-markdown-button-wrapper"
  );
  const previewWrapper = document.getElementById("copy-preview-button-wrapper");

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
