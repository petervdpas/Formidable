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
  if (!template?.storage_location) {
    EventBus.emit("status:update", "No template selected.");
    return;
  }

  const datafile = validateFilenameInput(
    container.querySelector("#meta-json-filename")
  );
  if (!datafile) {
    EventBus.emit("status:update", "Please enter a filename for datafile.");
    return;
  }

  // → bestaande `created` ophalen
  let created = null;
  try {
    const existing = await window.api.forms.loadForm(
      template.storage_location,
      datafile
    );
    created = existing?.meta?.created || null;
  } catch {}

  const { data, meta } = await getFormData(container, template);
  const userConfig = await window.api.config.loadUserConfig();

  const payload = {
    ...data,
    _meta: {
      ...meta,
      author_name: userConfig.author_name || "unknown",
      author_email: userConfig.author_email || "unknown@example.com",
      template: template.filename || "unknown",
      created,
      updated: new Date().toISOString(),
    },
  };

  const result = await window.api.forms.saveForm(
    template.storage_location,
    datafile,
    payload,
    template.fields || []
  );

  if (result.success) {
    EventBus.emit("status:update", `Saved: ${result.path}`);
    EventBus.emit("form:list:reload");
    setTimeout(() => EventBus.emit("form:list:highlighted", datafile), 500);
  } else {
    EventBus.emit("status:update", `Failed to save: ${result.error}`);
  }
}

export async function deleteForm(container, template, datafile) {
  if (!template || !template.storage_location) {
    warn("[deleteForm] No template selected for deletion.");
    EventBus.emit("status:update", "Cannot delete: template not selected.");
    return;
  }

  const confirmed = await showConfirmModal(
    `<div>Are you sure you want to delete this file?</div>
     <div class="modal-message-highlight"><em>${datafile}</em></div>`,
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
  const { data, meta } = await getFormData(container, template);
  if (!data || typeof data !== "object") {
    err("[Render] Invalid formData:", data);
    return;
  }

  log("[Render] Rendering Markdown...");
  const markdown = await window.api.transform.renderMarkdownTemplate(
    data,
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
