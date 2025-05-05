// modules/listManager.js

import { error, log, warn } from "./logger.js";
import { EventBus } from "./eventBus.js";
import { makeSelectableList } from "./uiBehaviors.js";

export function createListManager({
  elementId,
  fetchListFunction,
  onItemClick,
  emptyMessage = "No items.",
  addButton = null,
}) {
  const container = document.getElementById(elementId);
  if (!container) {
    error(`[ListManager] Element not found: #${elementId}`);
    throw new Error(`List container #${elementId} not found.`);
  }

  async function loadList() {
    log(`[ListManager] Loading list into #${elementId}...`);
    container.innerHTML = "";
    let selectedItem = null;
    try {
      const items = await fetchListFunction();
      log("[ListManager] Items:", items);

      if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      } else {
        const listItems = items.map((itemName) => {
          const item = document.createElement("div");
          item.className = "template-item";
          item.textContent = itemName.replace(/\.yaml$|\.md$/i, "");
          container.appendChild(item);
          return { element: item, value: itemName };
        });
        
        makeSelectableList(listItems, onItemClick);
      }

      if (addButton) {
        const btn = document.createElement("button");
        btn.textContent = addButton.label || "+ Add New";
        btn.className = "btn btn-default btn-add-item";
        btn.addEventListener("click", addButton.onClick);

        container.appendChild(btn);
      }

      EventBus.emit("status:update", `Loaded ${items.length} item(s).`);
    } catch (err) {
      error("[ListManager] Failed to load list:", err);
      container.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", "Error loading list.");
    }
  }

  return { loadList };
}
