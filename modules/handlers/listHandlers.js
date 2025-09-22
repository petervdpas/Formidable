// modules/handlers/listHandlers.js

import { EventBus } from "../eventBus.js";
import { ensureVirtualLocation } from "../../utils/vfsUtils.js";
import { clearHighlighted, highlightSelected } from "../../utils/domUtils.js";

let templateList = null;
let storageList = null;

export function bindListDependencies(deps) {
  templateList = deps.templateListManager;
  storageList = deps.storageListManager;
}

const refreshTimers = new Map();
const REFRESH_DELAY_MS = 120;

export function handleListRefreshAfterSave({ listId, name }) {
  const manager =
    listId === "template-list"
      ? templateList
      : listId === "storage-list"
      ? storageList
      : null;

  if (!manager || typeof manager.reloadList !== "function") return;

  const existing = refreshTimers.get(listId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    try {
      await manager.reloadList();
      if (name) {
        const event =
          listId === "template-list"
            ? "template:list:highlighted"
            : "form:list:highlighted";
        EventBus.emit(event, { name, click: false });
      }
    } finally {
      refreshTimers.delete(listId);
    }
  }, REFRESH_DELAY_MS);
  refreshTimers.set(listId, t);
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

export function handleListHighlighted({ listId, name, click = true }) {
  const container = document.getElementById(listId);
  if (!container || !name) return;

  const maxAttempts = 10;
  let attempt = 0;

  function tryHighlight() {
    const items =
      listId === "storage-list"
        ? Array.from(container.querySelectorAll(".storage-item"))
        : Array.from(container.querySelectorAll(".template-item"));

    const normalized = name
      .toLowerCase()
      .replace(/\.meta\.json$|\.yaml$|\.md$/i, "");

    const match =
      items.find(
        (el) => el.dataset?.value?.toLowerCase() === name.toLowerCase()
      ) ||
      items.find((el) => el.textContent.trim().toLowerCase() === normalized);

    if (match) {
      clearHighlighted(container);
      // ← no forced click unless explicitly asked
      highlightSelected(container, name, { click });
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
        EventBus.emit("status:update", {
          message: "status.context.not.template",
          languageKey: "status.context.not.template",
          i18nEnabled: true,
        });
        return;
      }

      const data = await EventBus.emitWithResponse("template:load", { name });

      EventBus.emit("template:selected", { name, yaml: data });

      EventBus.emit("status:update", {
        message: "status.template.load.success",
        languageKey: "status.template.load.success",
        i18nEnabled: true,
        args: [name],
      });
    }

    if (listId === "storage-list") {
      if (!window.currentSelectedTemplate) {
        EventBus.emit("status:update", {
          message: "status.template.first.select",
          languageKey: "status.template.first.select",
          i18nEnabled: true,
          log: true,
          logLevel: "warning",
          logOrigin: "ListHandlers:handleListItemClicked",
        });
        return;
      }

      const template = await ensureVirtualLocation(
        window.currentSelectedTemplate
      );

      const data = await EventBus.emitWithResponse("form:load", {
        templateFilename: template.filename,
        datafile: name,
        fields: template.fields || [],
      });

      if (!data) {
        EventBus.emit("status:update", {
          message: "status.datafile.load.failed",
          languageKey: "status.datafile.load.failed",
          i18nEnabled: true,
          args: [name],
        });
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

      EventBus.emit("form:selected", name);

      EventBus.emit("history:push", {
        template: template.filename,
        datafile: name,
      });

      EventBus.emit("status:update", {
        message: "status.datafile.ready",
        languageKey: "status.datafile.ready",
        i18nEnabled: true,
        args: [name],
        variant: "success",
      });
    }
  } catch (err) {
    EventBus.emit("status:update", {
      message: "status.item.load.failed",
      languageKey: "status.item.load.failed",
      i18nEnabled: true,
      args: [name, listId],
      log: true,
      logLevel: "error",
      logOrigin: "ListHandlers:handleListItemClicked",
    });
  }
}

// Update an existing item in the list (e.g., after save)
export function handleListUpdateItem({
  listId,
  name,
  updatedAt,
  tags,
  flagged,
}) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const cssEscape = (s) =>
    window.CSS && typeof CSS.escape === "function"
      ? CSS.escape(s)
      : String(s).replace(/[^a-zA-Z0-9_\-]/g, "\\$&");

  // Prefer exact match via data-value
  let item = listEl.querySelector(`[data-value="${cssEscape(name)}"]`);

  // If not in DOM (filtered/not loaded), do the debounced full refresh
  if (!item) {
    handleListRefreshAfterSave({ listId, name });
    return;
  }

  // Update flag UI
  if (typeof flagged === "boolean") {
    item.classList.toggle("is-flagged", flagged);
    const flagNode = item.querySelector(".flag-slot");
    if (flagNode)
      flagNode.innerHTML = flagged ? `<i class="fa fa-flag"></i>` : "";
  }

  // Update tags UI
  if (Array.isArray(tags)) {
    const sub = item.querySelector(".sublabel-slot");
    if (sub) sub.textContent = tags.join(", ");
  }

  // Update timestamp UI
  if (updatedAt) {
    item.dataset.updatedAt = String(updatedAt);
    const up = item.querySelector(".updated-slot");
    if (up) up.textContent = new Date(updatedAt).toISOString();
  }

  // keep it focused
  EventBus.emit("form:list:highlighted", { name, click: false });
}
