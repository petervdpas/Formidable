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
    listId === "template-list" ? templateList :
    listId === "storage-list" ? storageList :
    null;

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
