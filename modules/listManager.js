// modules/listManager.js

import { updateStatus } from "./statusManager.js";
import { log, warn, error } from "./logger.js";

export function createListManager({ 
  elementId, 
  fetchListFunction, 
  onItemClick, 
  emptyMessage = "No items.", 
  addButton = null
}) {
  const container = document.getElementById(elementId);
  if (!container) {
    error(`[ListManager] Element not found: #${elementId}`);
    throw new Error(`List container #${elementId} not found.`);
  }

  async function loadList() {
    log(`[ListManager] Loading list into #${elementId}...`);
    container.innerHTML = "";

    try {
      const items = await fetchListFunction();
      log("[ListManager] Items:", items);

      if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      } else {
        items.forEach((itemName) => {
          const item = document.createElement("div");
          item.className = "template-item"; 
          item.textContent = itemName.replace(/\.yaml$|\.md$/i, "");

          item.addEventListener("click", () => {
            onItemClick(itemName);
          });

          container.appendChild(item);
        });
      }

      // ➡️ Now add the extra button, if requested
      if (addButton) {
        const btn = document.createElement("button");
        btn.textContent = addButton.label || "+ Add New";
        btn.className = "btn btn-default btn-add-item"; // you can style this nicely
        btn.addEventListener("click", addButton.onClick);

        container.appendChild(btn);
      }

      updateStatus(`Loaded ${items.length} item(s).`);
    } catch (err) {
      error("[ListManager] Failed to load list:", err);
      container.innerHTML = "<div class='empty-message'>Error loading list.</div>";
      updateStatus("Error loading list.");
    }
  }

  return { loadList };
}
