// modules/listManager.js

import { EventBus } from "./eventBus.js";
import { makeSelectableList } from "../utils/domUtils.js";

export function createListManager({
  elementId,
  itemClass = "list-item",
  fetchListFunction,
  onItemClick,
  emptyMessage = "No items.",
  addButton = null,
}) {
  const container = document.getElementById(elementId);
  if (!container) {
    EventBus.emit("logging:error", [
      `[ListManager] Element not found: #${elementId}`,
    ]);
    throw new Error(`List container #${elementId} not found.`);
  }

  async function loadList() {
    EventBus.emit("logging:default", [
      `[ListManager] Loading list into #${elementId}...`,
    ]);
    container.innerHTML = "";
    try {
      const items = await fetchListFunction();
      EventBus.emit("logging:default", ["[ListManager] Items:", items]);

      if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      } else {
        const listItems = items.map((raw) => {
          const isObject = typeof raw === "object" && raw !== null;
          const display = isObject
            ? raw.display
            : raw.replace(/\.yaml$|\.md$/i, "");
          const value = isObject ? raw.value : raw;

          const item = document.createElement("div");
          item.className = itemClass;
          item.textContent = display;

          container.appendChild(item);
          return { element: item, value };
        });

        makeSelectableList(listItems, onItemClick);
      }

      if (addButton instanceof HTMLElement) {
        container.appendChild(addButton);
      }

      EventBus.emit("status:update", `Loaded ${items.length} item(s).`);
    } catch (err) {
      EventBus.emit("logging:error", [
        "[ListManager] Failed to load list:",
        err,
      ]);
      container.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", "Error loading list.");
    }
  }

  return { loadList };
}
