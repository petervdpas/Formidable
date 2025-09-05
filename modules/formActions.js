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
      EventBus.emit("status:update", {
        message: "status.save.cannot",
        languageKey: "status.save.cannot",
        i18nEnabled: true,
      });
      return;
    }

    const datafile = validateFilenameInput(
      container.querySelector("#meta-json-filename")
    );
    if (!datafile) {
      EventBus.emit("status:update", {
        message: "status.datafile.filename",
        languageKey: "status.datafile.filename",
        i18nEnabled: true,
      });
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

    // Inject tags from the single `tags` field into _meta.tags
    const tagFieldKey = (template.fields || []).find(
      (f) => f.type === "tags"
    )?.key;
    if (tagFieldKey) {
      const raw = data[tagFieldKey];
      let tags = [];
      if (Array.isArray(raw)) {
        tags = raw
          .map((t) => (typeof t === "string" ? t : t?.value))
          .filter(Boolean);
      } else if (typeof raw === "string") {
        tags = raw
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const norm = [
        ...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b));
      payload._meta.tags = norm;
    }

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
    EventBus.emit("status:update", {
      message: "status.delete.cannot.no.template",
      languageKey: "status.delete.cannot.no.template",
      i18nEnabled: true,
      log: true,
      logLevel: "warning",
      logOrigin: "formActions:deleteForm",
    });
    return;
  }

  const confirmed = await showConfirmModal(
    "special.file.delete.sure",
    `<div class="modal-message-highlight"><em>${datafile}</em></div>`,
    {
      okKey: "standard.delete",
      cancelKey: "standard.cancel",
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

  copyToClipboard(markdownBtn, () => markdown, ["Markdown"]);
  copyToClipboard(previewBtn, () => html, ["HTML"]);

  markdownWrapper.appendChild(markdownBtn);
  previewWrapper.appendChild(previewBtn);

  log("[Render] Showing render modal...");
  renderModal.show();
}
