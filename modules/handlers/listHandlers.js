import { EventBus } from "../eventBus.js";
import { highlightAndClickMatch } from "../../utils/domUtils.js";

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
  if (!listId || !name) return;

  const container = document.getElementById(listId);
  if (!container) {
    EventBus.emit("logging:warning", [
      `[ListHandler] Container not found: ${listId}`,
    ]);
    return;
  }

  highlightAndClickMatch(container, name);
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

      const template = window.currentSelectedTemplate;
      const dir = template.storage_location;
      const data = await window.api.forms.loadForm(
        dir,
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
