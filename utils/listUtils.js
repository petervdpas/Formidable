// utils/listUtils.js

import { EventBus } from "../modules/eventBus.js";
import { t } from "./i18n.js";

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
        EventBus.emit("logging:default", [
          "[SelectableList] Ignoring click on button inside item",
        ]);
        return;
      }
      EventBus.emit("logging:default", [
        "[SelectableList] Selecting item:",
        item.value,
      ]);
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
    EventBus.emit("logging:error", [
      `[createListManager] Element not found: #${elementId}`,
    ]);
    throw new Error(`List container #${elementId} not found.`);
  }

  // per-instance state
  let fullList = [];
  let lastFilteredCount = 0;

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
    host.innerHTML = ""; // clear any previous controls to avoid doubles
    host.appendChild(filterUI); // fragment contents or element
  }

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
      listWrapper.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
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

    lastFilteredCount = filteredItems.length;

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
    getFilteredCount: () => lastFilteredCount,
    getDomVisibleCount: () =>
      listWrapper.querySelectorAll(`.${itemClass}`).length,
  };
}

export function setBadgeText(el, i18nKey, args = []) {
  if (!el) return;
  el.setAttribute("data-i18n", i18nKey);
  el.setAttribute("data-i18n-args", JSON.stringify(args));
  const label = t(i18nKey, args);
  el.textContent = label;
  el.setAttribute("aria-label", label);
}

export function getVisibleCount(selector) {
  const nodes = document.querySelectorAll(selector);
  let n = 0;
  nodes.forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      (el.offsetParent !== null || cs.position === "fixed")
    )
      n++;
  });
  return n;
}

/**
 * Attach a dynamic, i18n-safe counter to any listManager.
 * mode: "total" (templates) or "filteredTotal" (forms)
 */
export function wrapRenderWithCounter(
  listManager,
  badgeEl,
  {
    containerId,
    itemClass,
    mode = "filteredTotal",
    i18nKeyTotal = "standard.nbr.of.items.total",
    i18nKeyFiltered = "standard.nbr.of.items.filtered",
  } = {}
) {
  if (!listManager || typeof listManager.renderList !== "function") return;

  const measure = () => {
    const total =
      typeof listManager.getItemCount === "function"
        ? listManager.getItemCount()
        : getVisibleCount(`#${containerId} .${itemClass}`);

    if (mode === "total") {
      setBadgeText(badgeEl, i18nKeyTotal, [total]);
      return;
    }

    const mgrFiltered =
      typeof listManager.getFilteredCount === "function"
        ? listManager.getFilteredCount()
        : null;

    const visible =
      typeof listManager.getDomVisibleCount === "function"
        ? listManager.getDomVisibleCount()
        : getVisibleCount(`#${containerId} .${itemClass}`);

    const filtered = Number.isFinite(mgrFiltered)
      ? Math.max(mgrFiltered, visible)
      : visible;

    setBadgeText(badgeEl, i18nKeyFiltered, [filtered, total]);
  };

  const afterPaint = () => requestAnimationFrame(measure);

  const origRender = listManager.renderList.bind(listManager);
  listManager.renderList = (dir, cb) =>
    origRender(dir, () => {
      afterPaint();
      if (typeof cb === "function") cb();
    });

  if (typeof listManager.loadList === "function") {
    const origLoad = listManager.loadList.bind(listManager);
    listManager.loadList = async (...args) => {
      const r = await origLoad(...args);
      afterPaint();
      return r;
    };
  }

  // refresh when i18n changes (EventBus) or browser lang change
  EventBus?.on?.("i18n:changed", afterPaint);
  window.addEventListener?.("languagechange", afterPaint);

  afterPaint();
}
