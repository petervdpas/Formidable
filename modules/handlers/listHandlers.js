// modules/handlers/listHandlers.js

import { EventBus } from "../eventBus.js";
import { ensureVirtualLocation } from "../../utils/vfsUtils.js";
import {
  clearHighlighted,
  highlightSelected
} from "../../utils/domUtils.js";

let templateList = null;
let storageList = null;

export function bindListDependencies(deps) {
  templateList = deps.templateListManager;
  storageList = deps.metaListManager;
}

export async function handleListReload({ listId }) {
  const manager =
    listId === "template-list"
      ? templateList
      : listId === "storage-list"
      ? storageList
      : null;

  if (!manager || typeof manager.reloadList !== "function") {
    return console.warn(`[ListHandler] No manager available for ${listId}`);
  }

  await manager.reloadList();
}

export function handleListHighlighted({ listId, name }) {
  const container = document.getElementById(listId);
  if (!container || !name) return;

  const maxAttempts = 10;
  let attempt = 0;

  function tryHighlight() {
    const items = Array.from(container.children);
    const normalized = name.toLowerCase().replace(/\.meta\.json$|\.yaml$|\.md$/i, "");

    const match =
      items.find((el) => el.textContent.trim().toLowerCase() === normalized) ||
      items.find((el) => el.dataset?.value?.toLowerCase() === name.toLowerCase());

    if (match) {
      clearHighlighted(container); // 🧼 first clear anything with matching data-list-id
      highlightSelected(container, name);
    } else if (attempt++ < maxAttempts) {
      setTimeout(tryHighlight, 100);
    }
  }

  tryHighlight();
}

export async function handleListItemClicked({ listId, name }) {
  try {
    if (!listId || !name) return;

    if (listId === "template-list") {
      const currentContext = await window.api.config
        .loadUserConfig()
        .then((cfg) => cfg.context_mode)
        .catch(() => "template");

      if (currentContext !== "template") {
        EventBus.emit("status:update", "You are not in Template context.");
        return;
      }

      const data = await window.api.templates.loadTemplate(name);
      EventBus.emit("context:select:template", { name, yaml: data });
      EventBus.emit("status:update", `Loaded Template: ${name}`);
    }

    if (listId === "storage-list") {
      if (!window.currentSelectedTemplate) {
        EventBus.emit("logging:warning", [
          "[handleListItemClicked] No template selected for entry.",
        ]);
        EventBus.emit("status:update", "Please select a template first.");
        return;
      }

      const template = await ensureVirtualLocation(window.currentSelectedTemplate);
      const data = await window.api.forms.loadForm(
        template.filename,
        name,
        template.fields || []
      );
      if (!data) {
        EventBus.emit("status:update", "Failed to load metadata entry.");
        return;
      }

      const formManager = window.formManager;
      if (!formManager) {
        EventBus.emit("logging:warning", [
          "[handleListItemClicked] No form manager available.",
        ]);
        return;
      }

      await formManager.loadFormData(data, name);

      EventBus.emit("context:select:form", name);
      EventBus.emit("status:update", `Loaded metadata: ${name}`);
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      `[handleListItemClicked] Failed to load item "${name}" for ${listId}:`,
      err,
    ]);
    EventBus.emit("status:update", `Error loading ${listId} item.`);
  }
}
