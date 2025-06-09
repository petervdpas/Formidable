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
  renderItemExtra = null,
  filterFunction = null,
  filterUI = null,
}) {
  const container = document.getElementById(elementId);
  if (!container) {
    EventBus.emit("logging:error", [
      `[ListManager] Element not found: #${elementId}`,
    ]);
    throw new Error(`List container #${elementId} not found.`);
  }

  // Static part: filter wrapper
  const filterWrapper = document.createElement("div");
  filterWrapper.className = "list-filter-wrapper";
  container.appendChild(filterWrapper);

  // Dynamic part: list contents
  const listWrapper = document.createElement("div");
  listWrapper.className = "list-items-wrapper";
  container.appendChild(listWrapper);

  // Inject static filter UI if provided
  if (filterUI instanceof HTMLElement) {
    filterWrapper.appendChild(filterUI);
  }

  let fullList = [];

  async function loadList() {
    EventBus.emit("logging:default", [
      `[ListManager] Loading list into #${elementId}...`,
    ]);
    listWrapper.innerHTML = "";
    try {
      const items = await fetchListFunction();
      fullList = items;

      renderList(); // initial render
    } catch (err) {
      EventBus.emit("logging:error", [
        "[ListManager] Failed to load list:",
        err,
      ]);
      listWrapper.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", "Error loading list.");
    }
  }

  function renderList(customFilter = filterFunction, postRender = null) {
    listWrapper.innerHTML = "";

    let filteredItems = fullList;
    if (typeof customFilter === "function") {
      filteredItems = fullList.filter(customFilter);
    }

    if (!filteredItems || filteredItems.length === 0) {
      listWrapper.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
    } else {
      const listItems = filteredItems.map((raw) => {
        const isObject = typeof raw === "object" && raw !== null;
        const display = isObject
          ? raw.display
          : raw.replace(/\.yaml$|\.md$/i, "");
        const value = isObject ? raw.value : raw;

        const item = document.createElement("div");
        item.className = itemClass;
        item.dataset.value = value;
        item.dataset.listId = elementId;

        // Enrich with additional attributes
        if (isObject) {
          for (const [key, val] of Object.entries(raw)) {
            if (typeof val === "string" || typeof val === "boolean") {
              item.dataset[key] = String(val);
            }
          }
        }

        item.appendChild(document.createTextNode(display));
        if (typeof renderItemExtra === "function") {
          renderItemExtra(item, raw);
        }

        listWrapper.appendChild(item);
        return { element: item, value };
      });

      makeSelectableList(listItems, onItemClick);
    }

    if (addButton instanceof HTMLElement) {
      listWrapper.appendChild(addButton);
    }

    if (typeof postRender === "function") {
      setTimeout(postRender, 0);
    }

    EventBus.emit("status:update", `Loaded ${filteredItems.length} item(s).`);
  }

  return {
    loadList,
    renderList,
    filterItems: (fn) => renderList(fn),
    injectFilterControl: (node) => {
      if (node instanceof HTMLElement) {
        filterWrapper.appendChild(node);
      }
    },
  };
}
