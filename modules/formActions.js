// modules/formActions.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { getFormData, validateFilenameInput } from "../utils/formUtils.js";
import { setupRenderModal } from "./modalSetup.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { copyToClipboard, waitForElement } from "../utils/domUtils.js";
import {
  createCopyMarkdownButton,
  createCopyPreviewButton,
} from "./uiButtons.js";

const log = (...args) => EventBus.emit("logging:default", args);
const warn = (...args) => EventBus.emit("logging:warning", args);
const err = (...args) => EventBus.emit("logging:error", args);

let savingInProgress = false;

export async function saveForm(container, template) {
  if (savingInProgress) {
    EventBus.emit("logging:warning", [
      "[saveForm] Already in progress. Ignoring duplicate save.",
    ]);
    return;
  }
  savingInProgress = true;

  try {
    template = await ensureVirtualLocation(template);
    if (!template?.virtualLocation) {
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

    let created = null;
    try {
      const existing = await EventBus.emitWithResponse("form:load", {
        templateFilename: template.filename,
        datafile: datafile,
      });
      created = existing?.meta?.created || null;
    } catch {}

    try {
      await waitForElement("[data-field-key]", container, 3000);
    } catch (e) {
      warn(`[saveForm] Warning: ${e.message}`);
    }

    const { data, meta } = await getFormData(container, template);

    const userConfig = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });

    const guidField = template.fields?.find((f) => f.type === "guid");
    const guidKey = guidField?.key || "id";
    const idValue = data[guidKey] || meta.id || null;

    const payload = {
      ...data,
      _meta: {
        ...meta,
        id: idValue,
        author_name: userConfig.author_name || "unknown",
        author_email: userConfig.author_email || "unknown@example.com",
        template: template.filename || "unknown",
        created,
        updated: new Date().toISOString(),
      },
    };

    await EventBus.emitWithResponse("form:save", {
      templateFilename: template.filename,
      datafile: datafile,
      payload: payload,
      fields: template.fields || [],
    });
  } finally {
    savingInProgress = false;
  }
}

export async function deleteForm(container, template, datafile) {
  template = await ensureVirtualLocation(template);
  if (!template || !template.virtualLocation) {
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

  await EventBus.emitWithResponse("form:delete", {
    templateFilename: template.filename,
    datafile: datafile,
    container: container,
  });
}

export async function renderFormPreview(container, template) {
  const renderModal = setupRenderModal();

  log("[Render] Collecting form data...");
  const { data, meta } = await getFormData(container, template);
  if (!data || typeof data !== "object") {
    err("[Render] Invalid formData:", data);
    return;
  }

  const markdown = await EventBus.emitWithResponse("transform:markdown", {
    data,
    template,
  });

  document.getElementById("render-output").textContent = markdown;

  const html = await EventBus.emitWithResponse("transform:html", markdown);

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
