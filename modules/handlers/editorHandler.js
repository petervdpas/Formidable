// modules/handlers/editorHandler.js

import { EventBus } from "../eventBus.js";
import { getValue as getMarkdownTemplate } from "../templateCodemirror.js";
import { showConfirmModal } from "../../utils/modalUtils.js";
import { clearContainerUI } from "../../utils/formUtils.js";

export async function handleSaveTemplate({ container, fields, callback }) {
  const name = container.querySelector("#yaml-name").value.trim();
  const markdownTemplate = getMarkdownTemplate();
  const enableCollection =
    document.getElementById("template-enable-collection")?.checked === true;
  const sidebarHandling =
    container.querySelector("#sidebar-handling")?.value.trim() || "";

  const updated = {
    name,
    markdown_template: markdownTemplate,
    sidebar_handling: sidebarHandling,
    enable_collection: enableCollection,
    fields,
  };

  // 🔍 Validatie
  const validationErrors = await new Promise((resolve) => {
    EventBus.emit("template:validate", { data: updated, callback: resolve });
  });
  if (validationErrors.length > 0) {
    const messages = validationErrors.map(formatError);
    EventBus.emit("logging:error", [
      "[Validator] Template bevat fouten:",
      ...messages,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    "[EditorHandler] Valid template → save triggered:",
    updated,
  ]);

  callback?.(updated);
}

export async function handleDeleteTemplate(container) {
  const template = window.currentSelectedTemplateName;
  if (!template) {
    EventBus.emit("logging:warning", [
      "[EditorHandler] No template selected to delete.",
    ]);
    EventBus.emit("status:update", "No template selected.");
    return;
  }

  const confirmed = await showConfirmModal(
    `<div>Are you sure you want to delete this template?</div>
     <div class="modal-message-highlight"><em>${template}</em></div>`,
    {
      okText: "Delete",
      cancelText: "Cancel",
      width: "auto",
      height: "auto",
    }
  );

  if (!confirmed) return;

  const success = await new Promise((resolve) => {
    EventBus.emit("template:delete", { name: template, callback: resolve });
  });

  if (success) {
    clearContainerUI(
      container,
      "sidebar.templates.placeholder",
      "Select or create a template-file to begin."
    );

    EventBus.emit("status:update", `Deleted template: ${template}`);
    EventBus.emit("logging:default", [
      "[EditorHandler] Deleted template:",
      template,
    ]);
    window.currentSelectedTemplate = null;
    window.currentSelectedTemplateName = null;
    window.templateListManager?.loadList?.();
  } else {
    EventBus.emit("logging:warning", [
      "[EditorHandler] Failed to delete template:",
      template,
    ]);
    EventBus.emit("status:update", "Failed to delete template.");
  }
}
