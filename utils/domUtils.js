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

  modal.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modal.classList.remove(cls);
    }
  });

  const typeDef = fieldTypes[typeKey];
  if (!typeDef?.cssClass) {
    EventBus.emit("logging:warning", [
      `[applyModalTypeClass] Unknown type "${typeKey}"`,
    ]);
    return;
  }

  const cssClass =
    typeof typeDef.cssClass === "string"
      ? typeDef.cssClass
      : typeDef.cssClass?.[mode] || typeDef.cssClass?.main;

  if (cssClass && typeof cssClass === "string") {
    modal.classList.add(cssClass);
  } else {
    EventBus.emit("logging:warning", [
      `[applyModalTypeClass] No cssClass found for type "${typeKey}", mode "${mode}"`,
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

  const loopChildKeys = new Set();

  let i = 0;
  while (i < fields.length) {
    const field = fields[i];
    const key = field.key;
    const value = data[key];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      group.forEach((f) => loopChildKeys.add(f.key));
      i = stopIdx + 1;

      const loopItems = container.querySelectorAll(
        `.loop-container[data-loop-key="${loopKey}"] .loop-item`
      );

      const loopData = data[loopKey] || [];

      for (let index = 0; index < loopData.length; index++) {
        const entry = loopData[index];
        const item = loopItems[index];
        if (!item) continue;

        for (const f of group) {
          await applyValueToField(
            item,
            f,
            entry[f.key],
            template,
            eventFunctions
          );
        }
      }

      continue;
    }

    if (loopChildKeys.has(key)) {
      i++;
      continue;
    }

    await applyValueToField(container, field, value, template, eventFunctions);
    i++;
  }

  EventBus.emit("logging:default", [
    "[applyFieldValues] Applied field values, skipping loop-child root keys.",
  ]);
}

export function makeSelectableList(
  items,
  onSelect,
  selectedClass = "selected"
) {
  items.forEach((item, index) => {
    const oldElement = item.element;
    const clean = oldElement.cloneNode(true);

    // 🛠 Restore dataset
    clean.dataset.value = oldElement.dataset.value;
    clean.dataset.listId = oldElement.dataset.listId;

    oldElement.replaceWith(clean);

    // 🔄 Replace the reference inside the array!
    items[index].element = clean;

    clean.addEventListener("click", () => {
      items.forEach(({ element }) => element.classList.remove(selectedClass));
      clean.classList.add(selectedClass);
      onSelect(item.value);
    });
  });
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
