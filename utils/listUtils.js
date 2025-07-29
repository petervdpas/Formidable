// utils/listUtils.js

import { EventBus } from "../modules/eventBus.js";

export function makeSelectableList(
  items,
  onSelect,
  selectedClass = "selected"
) {
  items.forEach((item) => {
    const el = item.element;

    el.addEventListener("click", (e) => {
      const isButtonClick =
        e.target.closest("button") || e.target.closest(".btn");
      if (isButtonClick) {
        console.log("[SelectableList] Ignoring click on button inside item");
        return;
      }

      console.log("[SelectableList] Selecting item:", item.value);
      items.forEach(({ element }) => element.classList.remove(selectedClass));
      el.classList.add(selectedClass);

      if (typeof onSelect === "function") {
        onSelect(item.value);
      }
    });
  });
}

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
      `[createListManager] Element not found: #${elementId}`,
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
      `[createListManager] Loading list into #${elementId}...`,
    ]);
    listWrapper.innerHTML = "";
    try {
      const items = await fetchListFunction();
      fullList = items;

      renderList(); // initial render
    } catch (err) {
      EventBus.emit("logging:error", [
        "[createListManager] Failed to load list:",
        err,
      ]);
      listWrapper.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", "Error loading list.");
    }
  }

  async function renderList(customFilter = filterFunction, postRender = null) {
    listWrapper.innerHTML = "";

    let filteredItems = fullList;
    if (typeof customFilter === "function") {
      filteredItems = fullList.filter(customFilter);
    }

    if (!filteredItems || filteredItems.length === 0) {
      listWrapper.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
    } else {
      const listItems = await Promise.all(
        filteredItems.map(async (raw) => {
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
            const skipKeys = new Set(["sidebarExpr", "sidebarContext"]);
            for (const [key, val] of Object.entries(raw)) {
              if (skipKeys.has(key)) continue;
              if (typeof val === "string" || typeof val === "boolean") {
                item.dataset[key] = String(val);
              }
            }
          }

          // Create structure: main + sub + flag
          const mainWrapper = document.createElement("div");
          mainWrapper.className = "list-item-main";

          const labelDiv = document.createElement("div");
          labelDiv.className = "list-item-label";
          labelDiv.textContent = display;

          const subDiv = document.createElement("div");
          subDiv.className = "list-item-sub";
          subDiv.textContent = ""; // Empty by default

          mainWrapper.appendChild(labelDiv);
          mainWrapper.appendChild(subDiv);

          const flagWrapper = document.createElement("div");
          flagWrapper.className = "list-item-flag";

          item.appendChild(mainWrapper);
          item.appendChild(flagWrapper);

          // Inject sublabel if needed
          if (typeof renderItemExtra === "function") {
            await renderItemExtra({
              subLabelNode: subDiv,
              flagNode: flagWrapper,
              itemNode: item,
              rawData: raw,
            });
          }

          listWrapper.appendChild(item);
          return { element: item, value };
        })
      );

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
