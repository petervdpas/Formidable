// utils/domUtils.js

import { EventBus } from "../modules/eventBus.js";
import {
  applyListField,
  applyTableField,
  applyMultioptionField,
  applyImageField,
  applyGenericField,
} from "./fieldAppliers.js";
import { collectLoopGroup } from "./formUtils.js";

// Highlight + click match
export function highlightAndClickMatch(container, targetName, onClickFallback = null) {
  if (!container || !targetName) {
    EventBus.emit("logging:warning", [
      "[highlightAndClickMatch] Missing container or targetName",
    ]);
    return;
  }

  const normalizedTarget = targetName
    .replace(/\.meta\.json$|\.yaml$|\.md$/i, "")
    .toLowerCase();

  const match = Array.from(container.children).find(
    (el) => el.textContent.trim().toLowerCase() === normalizedTarget ||
            el.dataset?.value?.toLowerCase() === targetName.toLowerCase()
  );

  if (match) {
    container
      .querySelectorAll(".selected")
      .forEach((el) => el.classList.remove("selected"));
    match.classList.add("selected");
    match.click();

    if (typeof onClickFallback === "function") {
      setTimeout(() => {
        if (!match.classList.contains("selected")) {
          EventBus.emit("logging:warning", [
            "[highlightAndClickMatch] Click failed, running fallback",
          ]);
          onClickFallback(targetName);
        }
      }, 50);
    }
  } else {
    EventBus.emit("logging:warning", [
      `[highlightAndClickMatch] No match found for: ${normalizedTarget}`,
    ]);
  }
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

export function applyModalTypeClass(modal, typeKey, fieldTypes) {
  if (!modal) return;

  modal.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modal.classList.remove(cls);
    }
  });

  const typeDef = fieldTypes[typeKey];
  if (typeDef?.cssClass) {
    modal.classList.add(typeDef.cssClass);
  } else {
    EventBus.emit("logging:warning", [
      `[applyModalTypeClass] Unknown type "${typeKey}"`,
    ]);
  }
}

export function applyValueToField(container, field, value, template) {
  const key = field.key;

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

  const radioGroup = container.querySelector(`[data-radio-group="${key}"]`);
  if (radioGroup) {
    const radios = radioGroup.querySelectorAll(`input[type="radio"]`);
    radios.forEach((radio) => {
      radio.checked = String(radio.value) === String(value);
    });
    return;
  }

  const input = container.querySelector(`[name="${key}"]`);
  if (input?.type === "file") return;

  applyGenericField(input, key, value);
}

export function applyFieldValues(container, template, data = {}) {
  if (!container || typeof container.querySelector !== "function") return;
  const fields = template?.fields || [];

  const loopChildKeys = new Set(); // 🔒 verzamelt innerlijke velden

  let i = 0;
  while (i < fields.length) {
    const field = fields[i];
    const key = field.key;
    const value = data[key];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      group.forEach((f) => loopChildKeys.add(f.key)); // 🧠 onthoud
      i = stopIdx + 1;

      const loopItems = container.querySelectorAll(
        `.loop-container[data-loop-key="${loopKey}"] .loop-item`
      );

      (data[loopKey] || []).forEach((entry, index) => {
        const item = loopItems[index];
        if (!item) return;

        group.forEach((f) => {
          applyValueToField(item, f, entry[f.key], template);
        });
      });

      continue;
    }

    // ⛔ skip loop child velden in root-toepassing
    if (loopChildKeys.has(key)) {
      i++;
      continue;
    }

    applyValueToField(container, field, value, template);
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
  items.forEach(({ element, value }) => {
    // Wipe old listeners: safest to clone
    const clean = element.cloneNode(true);
    element.replaceWith(clean);

    clean.addEventListener("click", () => {
      items.forEach(({ element }) => element.classList.remove(selectedClass));
      clean.classList.add(selectedClass);
      onSelect(value);
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
