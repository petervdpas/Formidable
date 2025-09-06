// utils/listUtils.js

import { EventBus } from "../modules/eventBus.js";

export function makeSelectableList(items, onSelect, selectedClass = "selected") {
  items.forEach((item) => {
    const el = item.element;
    el.addEventListener("click", (e) => {
      const isButtonClick = e.target.closest("button") || e.target.closest(".btn");
      if (isButtonClick) {
        EventBus.emit("logging:default", ["[SelectableList] Ignoring click on button inside item"]);
        return;
      }
      EventBus.emit("logging:default", ["[SelectableList] Selecting item:", item.value]);
      items.forEach(({ element }) => element.classList.remove(selectedClass));
      el.classList.add(selectedClass);
      if (typeof onSelect === "function") onSelect(item.value);
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
    EventBus.emit("logging:error", [`[createListManager] Element not found: #${elementId}`]);
    throw new Error(`List container #${elementId} not found.`);
  }

  // ── Idempotent wrappers: find or create once ─────────────────────
  let listWrapper = container.querySelector(":scope > .list-items-wrapper");
  if (!listWrapper) {
    listWrapper = document.createElement("div");
    listWrapper.className = "list-items-wrapper";
    container.appendChild(listWrapper);
  }

  let filterWrapper = container.querySelector(":scope > .list-filter-wrapper");
  const ensureFilterWrapper = () => {
    if (!filterWrapper) {
      filterWrapper = document.createElement("div");
      filterWrapper.className = "list-filter-wrapper";
      container.insertBefore(filterWrapper, listWrapper);
    }
    return filterWrapper;
  };

  // (Re)mount provided filter UI safely (supports Element or DocumentFragment)
  if (filterUI && (filterUI.nodeType === 1 || filterUI.nodeType === 11)) {
    const host = ensureFilterWrapper();
    host.innerHTML = "";            // clear any previous controls to avoid doubles
    host.appendChild(filterUI);     // fragment contents or element
  }

  let fullList = [];

  async function loadList() {
    EventBus.emit("logging:default", [`[createListManager] Loading list into #${elementId}...`]);
    listWrapper.innerHTML = "";
    try {
      const items = await fetchListFunction();
      fullList = items;
      renderList(); // initial render
    } catch (err) {
      listWrapper.innerHTML = "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", {
        message: "status.error.loading.list",
        languageKey: "status.error.loading.list",
        i18nEnabled: true,
        args: [err.message],
        log: true,
        logLevel: "error",
        logOrigin: "listUtils:createListManager",
      });
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
          const display = isObject ? raw.display : raw.replace(/\.yaml$|\.md$/i, "");
          const value = isObject ? raw.value : raw;

          const item = document.createElement("div");
          item.className = itemClass;
          item.dataset.value = value;
          item.dataset.listId = elementId;

          if (isObject) {
            const skipKeys = new Set(["sidebarExpr", "sidebarContext"]);
            for (const [key, val] of Object.entries(raw)) {
              if (skipKeys.has(key)) continue;
              if (typeof val === "string" || typeof val === "boolean") {
                item.dataset[key] = String(val);
              }
            }
          }

          const mainWrapper = document.createElement("div");
          mainWrapper.className = "list-item-main";

          const labelDiv = document.createElement("div");
          labelDiv.className = "list-item-label";
          labelDiv.textContent = display;

          const subDiv = document.createElement("div");
          subDiv.className = "list-item-sub";
          subDiv.textContent = "";

          mainWrapper.appendChild(labelDiv);
          mainWrapper.appendChild(subDiv);

          const flagWrapper = document.createElement("div");
          flagWrapper.className = "list-item-flag";

          item.appendChild(mainWrapper);
          item.appendChild(flagWrapper);

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
  }

  return {
    loadList,
    renderList,
    filterItems: (fn) => renderList(fn),
    injectFilterControl: (node) => {
      if (node && (node.nodeType === 1 || node.nodeType === 11)) {
        const host = ensureFilterWrapper();
        host.innerHTML = "";
        host.appendChild(node);
      }
    },
    getItemCount: () => fullList.length,
    getFilteredCount: () => listWrapper.querySelectorAll(`.${itemClass}`).length,
  };
}
