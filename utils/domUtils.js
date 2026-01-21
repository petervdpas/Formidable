// utils/domUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes } from "./fieldTypes.js";
import * as fieldRenderers from "./fieldRenderers.js";
import { Toast } from "./toastUtils.js";

export function waitForElement(selector, root = document.body, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = root.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

export function generateGuid() {
  return crypto.randomUUID();
}

export function clearHighlighted(container) {
  if (!container) return;

  const listId = container.id;

  const selectedEls = document.querySelectorAll(
    `.selected[data-list-id="${listId}"]`
  );

  EventBus.emit("logging:default", [
    `[clearHighlighted] Found ${selectedEls.length} .selected in [data-list-id="${listId}"]`,
  ]);

  selectedEls.forEach((el) => el.classList.remove("selected"));
}

export function highlightSelected(
  container,
  targetName,
  { click = false, onClickFallback = null } = {}
) {
  if (!container || !targetName) {
    EventBus.emit("logging:warning", [
      "[highlightSelected] Missing container or targetName",
    ]);
    return;
  }

  const normalizedTarget = targetName
    .replace(/\.meta\.json$|\.yaml$|\.md$/i, "")
    .toLowerCase();

  const items = Array.from(container.querySelectorAll("[data-value]"));

  const match =
    items.find(
      (el) => el.textContent.trim().toLowerCase() === normalizedTarget
    ) ||
    items.find(
      (el) => el.dataset?.value?.toLowerCase() === targetName.toLowerCase()
    );

  if (!match) {
    EventBus.emit("logging:warning", [
      `[highlightSelected] No match found for: ${normalizedTarget}`,
    ]);
    return;
  }

  match.classList.add("selected");

  if (click) {
    match.click();

    if (typeof onClickFallback === "function") {
      setTimeout(() => {
        if (!match.classList.contains("selected")) {
          EventBus.emit("logging:warning", [
            "[highlightSelected] Click failed, running fallback",
          ]);
          onClickFallback(targetName);
        }
      }, 50);
    }
  }
}

export function highlightAndClickForm(entry, delay = 100) {
  if (!entry) return;

  setTimeout(() => {
    EventBus.emit("form:list:highlighted", entry);
  }, delay);
}

export function createFieldManager({
  container,
  fields = [],
  data = {},
  renderField = null,
  beforeEach = null,
  afterEach = null,
  clear = true,
  injectBefore = null,
  injectAfter = null,
  onSave = null,
}) {
  if (!container) {
    EventBus.emit("logging:error", ["[FieldManager] container is null"]);
    throw new Error("FieldManager container is required.");
  }

  if (renderField && typeof renderField !== "function") {
    throw new Error("renderField must be a function if provided.");
  }

  const enrichedData = {};
  const inputRefs = {};

  for (const field of fields) {
    const raw = data?.[field.key];
    enrichedData[field.key] =
      field.type === "boolean"
        ? raw === true || raw === "true"
        : raw ?? (field.type === "boolean" ? false : "");
  }

  async function renderFields() {
    if (clear) container.innerHTML = "";

    if (typeof injectBefore === "function") {
      const beforeEl = await injectBefore(container);
      const nodes = Array.isArray(beforeEl) ? beforeEl : [beforeEl];
      for (const el of nodes) {
        if (el instanceof HTMLElement) container.appendChild(el);
      }
    }

    for (const field of fields) {
      if (typeof beforeEach === "function") await beforeEach(field);

      const value = enrichedData[field.key];

      const renderFn =
        renderField ||
        (async (f, val) => {
          const fn =
            (f.fieldRenderer && fieldRenderers[f.fieldRenderer]) ||
            fieldRenderers[
              `render${f.type?.[0]?.toUpperCase()}${f.type?.slice(1)}Field`
            ] ||
            fieldRenderers.renderTextField;
          return await fn(f, val);
        });

      const node = await renderFn(field, value);

      if (node instanceof HTMLElement) {
        container.appendChild(node);

        const input = node.querySelector(`[name="${field.key}"]`);
        if (input) inputRefs[field.key] = input;

        if (onSave && input) {
          input.addEventListener("change", () => {
            const val =
              field.type === "boolean" ? input.checked : input.value ?? "";
            enrichedData[field.key] = val;
            onSave(field, val);
          });
        }
      }

      if (typeof afterEach === "function") await afterEach(field);
    }

    if (typeof injectAfter === "function") {
      const afterEl = await injectAfter(container);
      const nodes = Array.isArray(afterEl) ? afterEl : [afterEl];
      for (const el of nodes) {
        if (el instanceof HTMLElement) container.appendChild(el);
      }
    }

    EventBus.emit("logging:default", [
      `[FieldManager] Rendered ${fields.length} field(s).`,
    ]);
  }

  function getValue(key) {
    const field = fields.find((f) => f.key === key);
    if (!field) return undefined;

    const input = inputRefs[key];
    if (input) {
      return field.type === "boolean" ? input.checked : input.value ?? "";
    }

    return enrichedData[key];
  }

  function getValues() {
    const values = {};
    for (const field of fields) {
      const input = inputRefs[field.key];
      let value;

      if (input) {
        value = field.type === "boolean" ? input.checked : input.value ?? "";
      } else {
        value = enrichedData[field.key];
      }

      values[field.key] = value;
    }
    return values;
  }

  function setValue(key, value) {
    enrichedData[key] = value;
    const input = inputRefs[key];
    if (input) {
      if (input.type === "checkbox") {
        input.checked = !!value;
      } else {
        input.value = value ?? "";
      }
    }
  }

  function setValues(values = {}) {
    for (const [key, val] of Object.entries(values)) {
      setValue(key, val);
    }
  }

  return {
    renderFields,
    getValue,
    getValues,
    setValue,
    setValues,
  };
}

export function delayPaintSafe(cb, fallbackDelay = 500) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(cb, { timeout: fallbackDelay });
  } else {
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(cb);
      });
    }, fallbackDelay);
  }
}

export function resolveScopedElement(container, field) {
  const attr = `[name="${field.key}"], [data-${field.type}-field="${field.key}"]`;
  return container.querySelector(attr);
}

export function applyFieldContextAttributes(el, { key, type, loopKey = null, guid = null }) {
  if (!el || !key || !type) return;

  el.dataset.fieldKey = key;
  el.dataset.fieldType = type;

  // Always add a unique GUID to enable precise field targeting (especially in loops)
  el.dataset.fieldGuid = guid || generateGuid();

  if (loopKey) {
    // Support both string and array input
    const loopChain = Array.isArray(loopKey) ? loopKey : [loopKey];
    el.dataset.fieldLoop = loopChain.join(".");
  }
}

export function applyDatasetMapping(el, sources, mappings = []) {
  if (!el || typeof el.dataset === "undefined") return;
  if (!Array.isArray(sources)) sources = [sources];

  mappings.forEach(({ from, to }) => {
    for (const source of sources) {
      if (source && source[from] != null && source[from] !== "") {
        el.dataset[to] = source[from];
        EventBus.emit("logging:default", [
          `[applyDatasetMapping] Set data-${to} = ${source[from]}`,
        ]);
        break; // Stop at first valid match
      }
    }
  });
}

export function focusFirstInput(
  container,
  selector = "input, select, textarea",
  retries = 5
) {
  function tryFocus(attempt) {
    const input = container.querySelector(selector);
    if (input) {
      input.focus();
      EventBus.emit("logging:default", [
        "[focusFirstInput] Focused first input.",
      ]);
    } else if (attempt < retries) {
      requestAnimationFrame(() => tryFocus(attempt + 1));
    } else {
      EventBus.emit("logging:warning", [
        "[focusFirstInput] No input to focus after retries.",
      ]);
    }
  }

  tryFocus(0);
}

export function applyModalTypeClass(modal, typeKey, fieldTypes, mode = "main") {
  if (!modal) return;

  // Remove previous modal-* class, keep "modal"
  modal.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modal.classList.remove(cls);
    }
  });

  const typeDef = fieldTypes[typeKey];
  if (!typeDef || !typeDef.cssClass) {
    EventBus.emit("logging:warning", [
      `[applyModalTypeClass] Unknown type "${typeKey}"`,
    ]);
    return;
  }

  let cssClass = typeDef.cssClass;

  if (typeof cssClass === "object") {
    cssClass = cssClass[mode] || cssClass.main || null;
  }

  if (typeof cssClass === "string" && cssClass.trim() !== "") {
    modal.classList.add(cssClass);
  } else {
    EventBus.emit("logging:warning", [
      `[applyModalTypeClass] No valid cssClass found for type "${typeKey}", mode "${mode}"`,
    ]);
  }
}

export async function applyValueToField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  if (field.type === "loopstart" || field.type === "loopstop") {
    EventBus.emit("logging:default", [
      `[applyValueToField] Skipping loop control field: ${field.type}`,
    ]);
    return;
  }

  const def = fieldTypes[field.type];
  if (!def || typeof def.applyValue !== "function") {
    EventBus.emit("logging:warning", [
      `[applyValueToField] No applyValue for type="${field.type}"`,
    ]);
    return;
  }

  try {
    await def.applyValue(container, field, value, template, eventFunctions);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[applyValueToField] Error applying value for "${field.key}"`,
      err,
    ]);
  }
}

export function bindActionHandlers(container, selector, callback) {
  if (!container || typeof container.querySelectorAll !== "function") {
    EventBus.emit("logging:warning", [
      "[bindActionHandlers] Invalid container.",
    ]);
    return;
  }

  const items = container.querySelectorAll(selector);
  items.forEach((el) => {
    const action = el.getAttribute("data-action");
    if (!action) return;

    EventBus.emit("logging:default", [
      `[bindActionHandlers] Binding action handler: ${action}`,
    ]);
    el.addEventListener("click", () => {
      EventBus.emit("logging:default", [
        `[bindActionHandlers] Triggered action: ${action}`,
      ]);
      callback(action);
    });
  });
}

export function syncScroll(el1, el2) {
  let isSyncing = false;

  const sync = (source, target) => () => {
    if (isSyncing) return;
    isSyncing = true;

    const ratio =
      source.scrollTop / (source.scrollHeight - source.clientHeight);
    target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);

    isSyncing = false;
  };

  el1.addEventListener("scroll", sync(el1, el2));
  el2.addEventListener("scroll", sync(el2, el1));
}

export function copyToClipboard(
  button,
  contentFn,
  args = [],
  {
    successMessage = "toast.copy.clipboard",
    errorMessage = "toast.copy.failed",
  } = {}
) {
  if (!button) {
    EventBus.emit("logging:warning", [
      "[copyToClipboard] Missing button element",
    ]);
    return;
  }

  let busy = false;
  button.onclick = async () => {
    if (busy) return;
    busy = true;

    try {
      const text = await Promise.resolve(contentFn());
      if (typeof text !== "string")
        throw new Error("copyToClipboard: contentFn must return a string");

      const canUseClipboard =
        window.isSecureContext &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function";

      if (canUseClipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: hidden textarea + execCommand
        const active = document.activeElement;
        const selection = document.getSelection();
        const savedRanges = [];
        if (selection && selection.rangeCount) {
          for (let i = 0; i < selection.rangeCount; i++)
            savedRanges.push(selection.getRangeAt(i));
        }

        const ta = document.createElement("textarea");
        ta.value = text;
        // keep it off-screen & minimal layout impact
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.left = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);

        ta.select();
        ta.setSelectionRange(0, ta.value.length);

        const ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);

        // Restore selection / focus
        selection?.removeAllRanges?.();
        savedRanges.forEach((r) => selection?.addRange?.(r));
        active?.focus?.();

        if (!ok) throw new Error("execCommand copy failed");
      }
      Toast.success(successMessage, args);
    } catch (e) {
      EventBus.emit("logging:error", ["[Clipboard] Copy failed", e]);
      Toast.error(errorMessage, args);
    } finally {
      // tiny debounce to avoid accidental double clicks
      setTimeout(() => {
        busy = false;
      }, 150);
    }
  };
}

/**
 * Create a scoped, predicate-aware Sortable instance.
 * @param {HTMLElement} container - The parent container of sortable items
 * @param {Object} options
 * @param {string} options.handle - Selector for the drag handle
 * @param {string} [options.group="loop-items"] - Group name for sortable
 * @param {boolean|function} [options.allowDrag] - false = collapsed only, function = custom predicate
 * @param {string} [options.itemSelector=".loop-item"] - Selector for sortable children
 * @param {boolean} [options.preventOnFilter=false] - If true, prevents all pointer interaction when filtered
 */
export function createSortable(
  container,
  {
    handle,
    group = "loop-items",
    allowDrag = false,
    itemSelector = ".loop-item",
    preventOnFilter = false,
    innerGuard = false,
  } = {}
) {
  if (!container || !(container instanceof HTMLElement)) {
    EventBus.emit("logging:error", ["[createSortable] Invalid container"]);
    return;
  }

  const isAllowed =
    typeof allowDrag === "function"
      ? allowDrag
      : (el) => allowDrag || el.classList.contains("collapsed");

  let lastToastTime = 0;

  Sortable.create(container, {
    animation: 150,
    handle,
    group,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    setPlaceholderSize: true,

    filter: (evt) => {
      const now = Date.now();
      const item = evt.target.closest(itemSelector);
      const fromHandle = evt.target.closest(handle);

      // If this hit originated in a nested inner DnD, block early.
      if (!fromHandle && evt.target.closest(".inner-dnd")) return true;

      const blocked =
        !item || !container.contains(item) || !fromHandle || !isAllowed(item);

      const isPointerDown =
        (evt.originalEvent?.type || evt.type) === "mousedown" ||
        (evt.originalEvent?.type || evt.type) === "pointerdown" ||
        (evt.originalEvent?.type || evt.type) === "touchstart";

      if (
        blocked &&
        isPointerDown &&
        fromHandle &&
        now - lastToastTime > 1500
      ) {
        lastToastTime = now;
        Toast.info("toast.dragging.item.collapse", [], { duration: 2500 });
      }

      return blocked;
    },

    preventOnFilter,

    onStart: (evt) => {
      // If this is an inner sortable, stop bubbling so parent sortables never see it
      if (innerGuard) {
        evt?.originalEvent?.stopPropagation?.();
        document.body.classList.add("inner-dnd-active");
      }

      const original = evt.item;
      requestAnimationFrame(() => {
        const drag = container.querySelector(".sortable-drag");
        if (drag && original) {
          const style = getComputedStyle(original);
          drag.style.height = `${original.offsetHeight}px`;
          drag.style.width = `${original.offsetWidth}px`;
          drag.style.padding = style.padding;
          drag.style.margin = style.margin;
          drag.style.borderRadius = style.borderRadius;
          drag.style.opacity = "0.95";
          drag.style.background = "var(--sortable-drag-bg, #ffe082)";
        }
      });
    },
    onEnd: (evt) => {
      if (innerGuard) {
        document.body.classList.remove("inner-dnd-active");
      }
      evt.item.style.transform = "";
      evt.item.style.transition = "";
    },
  });
}

/**
 * Make a reusable "pilled-badge" (chip).
 * No dependencies, pure DOM.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {"neutral"|"primary"|"info"|"success"|"warn"|"error"} [opts.variant="neutral"]
 * @param {"sm"|"lg"|""} [opts.size="sm"]
 * @param {boolean} [opts.solid=false]
 * @param {boolean} [opts.outline=false]
 * @param {boolean} [opts.dot=false]
 * @param {boolean} [opts.clickable=false]
 * @param {string}  [opts.title=""]
 * @returns {HTMLSpanElement}
 */
export function makePill(
  text,
  {
    variant = "neutral",
    size = "sm",
    solid = false,
    outline = false,
    dot = false,
    clickable = false,
    title = "",
  } = {}
) {
  const el = document.createElement("span");
  el.className = [
    "pilled-badge",
    variant && `pilled-badge--${variant}`,
    size === "sm"
      ? "pilled-badge--sm"
      : size === "lg"
      ? "pilled-badge--lg"
      : "",
    solid && "pilled-badge--solid",
    outline && "pilled-badge--outline",
    dot && "pilled-badge--dot",
    clickable && "pilled-badge--clickable",
  ]
    .filter(Boolean)
    .join(" ");

  el.textContent = text;
  if (title) el.title = title;
  return el;
}
