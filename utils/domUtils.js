// utils/domUtils.js

import { EventBus } from "../modules/eventBus.js";
import {
  applyGuidField,
  applyListField,
  applyTableField,
  applyMultioptionField,
  applyImageField,
  applyRangeField,
  applyLinkField,
  applyGenericField,
} from "./fieldAppliers.js";
import { collectLoopGroup } from "./formUtils.js";
import * as fieldRenderers from "./fieldRenderers.js";

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

export function applyExternalLinkBehavior(container) {
  if (!container) return;

  container.querySelectorAll("a[href]").forEach((a) => {
    const url = a.getAttribute("href");
    if (!url || url.startsWith("#") || url.startsWith("javascript:")) return;

    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");

    a.addEventListener("click", (e) => {
      e.preventDefault();
      EventBus.emit("file:openExternal", { url });
    });
  });
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

  return {
    renderFields,
    getValues,
    setValue,
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

export function applyFieldContextAttributes(el, { key, type, loopKey = null }) {
  if (!el || !key || !type) return;

  el.dataset.fieldKey = key;
  el.dataset.fieldType = type;

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
  const key = field.key;

  if (container.querySelector(`[data-guid-field="${key}"]`)) {
    applyGuidField(container, key, value);
    return;
  }

  if (container.querySelector(`[data-multioption-field="${key}"]`)) {
    applyMultioptionField(container, key, value);
    return;
  }

  if (container.querySelector(`[data-list-field="${key}"]`)) {
    applyListField(container, field, value);
    return;
  }

  if (container.querySelector(`[data-table-field="${key}"]`)) {
    applyTableField(container, key, value);
    return;
  }

  if (container.querySelector(`[data-image-field="${key}"]`)) {
    applyImageField(container, key, value, template);
    return;
  }

  if (container.querySelector(`[data-link-field="${key}"]`)) {
    await applyLinkField(container, field, value, eventFunctions);
    return;
  }

  const radioGroup = container.querySelector(`[data-radio-group="${key}"]`);
  if (radioGroup) {
    const radios = radioGroup.querySelectorAll(`input[type="radio"]`);
    radios.forEach((radio) => {
      radio.checked = String(radio.value) === String(value);
    });
    return;
  }

  if (container.querySelector(`[data-range-field="${key}"]`)) {
    applyRangeField(container, field, value);
    return;
  }

  const input = container.querySelector(`[name="${key}"]`);
  if (input?.type === "file") return;

  applyGenericField(input, key, value);
}

export async function applyFieldValues(
  container,
  template,
  data = {},
  eventFunctions = {}
) {
  if (!container || typeof container.querySelector !== "function") return;

  const fields = template?.fields || [];

  async function applyFieldsToGroup(fields, container, data, loopKeyChain = []) {
    let i = 0;

    while (i < fields.length) {
      const field = fields[i];
      const key = field.key;
      const value = data?.[key];

      if (field.type === "loopstart") {
        const loopKey = key;
        const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
        i = stopIdx + 1;

        const loopData = Array.isArray(data?.[loopKey]) ? data[loopKey] : [];

        // Get loop container
        const containerSelector = `.loop-container[data-loop-key="${loopKey}"]`;
        const loopContainer = container.querySelector(containerSelector);
        const addButton = loopContainer?.querySelector(`[data-action="add-loop-item"]`);

        if (!loopContainer || !addButton) {
          EventBus.emit("logging:warning", [
            `[applyFieldValues] Missing container or button for loop "${loopKey}"`,
          ]);
          continue;
        }

        // Ensure enough loop items are rendered
        while (loopContainer.querySelectorAll(".loop-item").length < loopData.length) {
          addButton.click();
          await new Promise((r) => setTimeout(r, 10)); // Allow render to catch up
        }

        const loopItems = loopContainer.querySelectorAll(".loop-item");

        for (let idx = 0; idx < loopItems.length; idx++) {
          const item = loopItems[idx];
          const entry = loopData[idx] || {};

          await applyFieldsToGroup(group, item, entry, [...loopKeyChain, loopKey]);
        }
      } else {
        const scopedField = { ...field, loopKey: loopKeyChain };
        await applyValueToField(container, scopedField, value, template, eventFunctions);
        i++;
      }
    }
  }

  await applyFieldsToGroup(fields, container, data);

  EventBus.emit("logging:default", [
    "[applyFieldValues] Completed nested loop-aware value application.",
  ]);
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
  {
    successMessage = "Copied to clipboard",
    errorMessage = "Failed to copy",
  } = {}
) {
  if (!button) {
    EventBus.emit("logging:warning", [
      "[copyToClipboard] Missing button element",
    ]);
    return;
  }

  button.onclick = () =>
    navigator.clipboard
      .writeText(contentFn())
      .then(() =>
        EventBus.emit("ui:toast", {
          message: successMessage,
          variant: "success",
        })
      )
      .catch((e) => {
        EventBus.emit("logging:error", ["[Clipboard] Copy failed", e]);
        EventBus.emit("ui:toast", {
          message: errorMessage,
          variant: "error",
        });
      });
}
