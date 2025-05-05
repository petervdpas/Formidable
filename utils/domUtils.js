// modules/uiBehaviors.js

import { log, warn } from "./logger.js";

// Highlight + click match
export function highlightAndClickMatch(
  container,
  targetName,
  onClickFallback = null
) {
  if (!container || !targetName) {
    warn("[highlightAndClickMatch] Missing container or targetName");
    return;
  }

  const normalizedTarget = targetName
    .replace(/\.yaml$|\.md$/i, "")
    .toLowerCase();

  const match = Array.from(container.children).find(
    (el) => el.textContent.trim().toLowerCase() === normalizedTarget
  );

  if (match) {
    container.querySelectorAll(".selected").forEach((el) =>
      el.classList.remove("selected")
    );
    match.classList.add("selected");

    match.click();

    if (typeof onClickFallback === "function") {
      setTimeout(() => {
        if (!match.classList.contains("selected")) {
          warn("[highlightAndClickMatch] Click failed, running fallback");
          onClickFallback(targetName);
        }
      }, 50);
    }
  } else {
    warn(`[highlightAndClickMatch] No match found for: ${normalizedTarget}`);
  }
}

export function focusFirstInput(
  container,
  selector = 'input, select, textarea'
) {
  setTimeout(() => {
    const firstInput = container.querySelector(selector);
    if (firstInput) {
      firstInput.focus();
      log("[UI] Focused first input.");
    } else {
      warn("[UI] No input to focus.");
    }
  }, 0); // 🔁 defer until after DOM update
}

export function applyFieldValues(container, fieldsOrKeys = [], data = {}) {
  if (!container || typeof container.querySelector !== "function") {
    warn("[UI] applyFieldValues: Invalid container.");
    return;
  }

  if (!data || typeof data !== "object") {
    warn("[UI] applyFieldValues: No valid data object provided.");
    return;
  }

  const keys = fieldsOrKeys
    .map((f) => (typeof f === "string" ? f : f?.key))
    .filter(Boolean);

  keys.forEach((key) => {
    const value = data[key];
    const input = container.querySelector(`[name="${key}"]`);

    if (!input) {
      warn(`[UI] applyFieldValues: Missing input for key "${key}".`);
      return;
    }

    if (input.type === "checkbox") {
      input.checked = value === true;
    } else if (input.type === "radio") {
      const group = container.querySelectorAll(
        `input[type="radio"][name="${key}"]`
      );
      group.forEach((el) => {
        el.checked = el.value === value;
      });
    } else if ("value" in input) {
      input.value = value ?? "";
    } else {
      warn(`[UI] applyFieldValues: Unsupported input for key "${key}".`);
    }
  });

  log("[UI] applyFieldValues: Applied field values.");
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
    warn("[UI] bindActionHandlers: Invalid container.");
    return;
  }

  const items = container.querySelectorAll(selector);
  items.forEach((el) => {
    const action = el.getAttribute("data-action");
    if (!action) return;

    log(`[UI] Binding action handler: ${action}`);
    el.addEventListener("click", () => {
      log(`[UI] Triggered action: ${action}`);
      callback(action);
    });
  });
}
