// modules/handlers/editorHandler.js

import { EventBus } from "../eventBus.js";
import { getValue as getMarkdownTemplate } from "../templateCodemirror.js";

export function handleSaveTemplate({ container, fields, callback }) {
  const name = container.querySelector("#yaml-name").value.trim();
  const storageLocation = container.querySelector("#storage-location").value.trim();
  const markdownTemplate = getMarkdownTemplate();

  const updated = {
    name,
    storage_location: storageLocation,
    markdown_template: markdownTemplate,
    fields,
  };

  EventBus.emit("logging:default", [
    "[EditorHandler] handleSaveTemplate → Saving updated data:",
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

  const confirmed = await window.showConfirmModal?.(
    `Are you sure you want to delete template: ${template}?`,
    {
      okText: "Delete",
      cancelText: "Cancel",
      width: "auto",
      height: "auto",
    }
  );

  if (!confirmed) return;

  const success = await window.api.templates.deleteTemplate(template);
  if (success) {
    container.innerHTML = "<div class='empty-message'>Template deleted.</div>";
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