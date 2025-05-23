// utils/domUtils.js

import { EventBus } from "../modules/eventBus.js";
import {
  applyListField,
  applyTableField,
  applyMultioptionField,
  applyGenericField,
} from "./fieldAppliers.js";

// Highlight + click match
export function highlightAndClickMatch(
  container,
  targetName,
  onClickFallback = null
) {
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
    (el) => el.textContent.trim().toLowerCase() === normalizedTarget
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
  selector = "input, select, textarea"
) {
  setTimeout(() => {
    const firstInput = container.querySelector(selector);
    if (firstInput) {
      firstInput.focus();
      EventBus.emit("logging:default", [
        "[focusFirstInput] Focused first input.",
      ]);
    } else {
      EventBus.emit("logging:warning", [
        "[focusFirstInput] No input to focus.",
      ]);
    }
  }, 0); // 🔁 defer until after DOM update
}

export function applyFieldValues(container, fieldsOrKeys = [], data = {}) {
  if (!container || typeof container.querySelector !== "function") {
    EventBus.emit("logging:default", ["[applyFieldValues] Invalid container."]);
    return;
  }

  if (!data || typeof data !== "object") {
    EventBus.emit("logging:default", [
      "[applyFieldValues] No valid data object provided.",
    ]);
    return;
  }

  const keys = fieldsOrKeys
    .map((f) => (typeof f === "string" ? f : f?.key))
    .filter(Boolean);

  keys.forEach((key) => {
    const value = data[key];

    if (container.querySelector(`[data-multioption-field="${key}"]`)) {
      applyMultioptionField(container, key, value);
      return;
    }

    if (container.querySelector(`[data-list-field="${key}"]`)) {
      applyListField(container, key, value);
      return;
    }

    if (container.querySelector(`[data-table-field="${key}"]`)) {
      applyTableField(container, key, value);
      return;
    }

    // ✅ Handle radios here
    const radioGroup = container.querySelector(`[data-radio-group="${key}"]`);
    if (radioGroup) {
      const radios = radioGroup.querySelectorAll(`input[type="radio"]`);
      radios.forEach((radio) => {
        radio.checked = String(radio.value) === String(value);
      });
      return;
    }

    // Default
    const input = container.querySelector(`[name="${key}"]`);
    applyGenericField(input, key, value);
  });

  EventBus.emit("logging:default", [
    "[applyFieldValues] Applied field values.",
  ]);
}

export function makeSelectableList(
  items,
  onSelect,
  selectedClass = "selected"
) {
  let current = null;

  items.forEach(({ element, value }) => {
    element.addEventListener("click", () => {
      if (current) current.classList.remove(selectedClass);
      element.classList.add(selectedClass);
      current = element;
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
