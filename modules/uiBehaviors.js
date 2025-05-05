// modules/uiBehaviors.js

import { EventBus } from "./eventBus.js";
import { log, warn } from "./logger.js";

// Theme toggle logic
export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    EventBus.emit("theme:toggle", isDark ? "dark" : "light");
  });
}

// Splitter logic
export function setupSplitter({ splitter, left, right, container, min = 150 }) {
  let isDragging = false;
  let startX = 0;
  let startLeftWidth = 0;

  const handle = splitter.querySelector("div");

  const updateCursor = (active) => {
    document.body.style.cursor = active ? "col-resize" : "";
  };

  handle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startLeftWidth = left.offsetWidth;
    updateCursor(true);
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const newLeftWidth = startLeftWidth + dx;
    const containerWidth = container.clientWidth;
    const maxLeftWidth = containerWidth - min;

    if (newLeftWidth >= min && newLeftWidth <= maxLeftWidth) {
      left.style.width = `${newLeftWidth}px`;
      right.style.width = `${
        containerWidth - newLeftWidth - splitter.offsetWidth
      }px`;
      left.style.flex = "none";
      right.style.flex = "none";
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      updateCursor(false);
    }
  });
}

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
    if (!match.classList.contains("selected")) {
      match.click();

      if (typeof onClickFallback === "function") {
        setTimeout(() => {
          if (!match.classList.contains("selected")) {
            warn("[highlightAndClickMatch] Click failed, running fallback");
            onClickFallback(targetName);
          }
        }, 50);
      }
    }
  } else {
    warn(`[highlightAndClickMatch] No match found for: ${normalizedTarget}`);
  }
}

export function createStyledLabel(
  text,
  { forId = null, className = "", styles = {} } = {}
) {
  const label = document.createElement("label");
  label.textContent = text;
  if (forId) label.htmlFor = forId;
  if (className) label.className = className;

  // Apply default and custom styles
  Object.assign(label.style, {
    display: "block",
    marginBottom: "6px",
    ...styles,
  });

  return label;
}

export function createStyledSelect({
  className = "",
  styles = {},
  attributes = {},
} = {}) {
  const select = document.createElement("select");
  if (className) select.className = className;

  // Apply default and custom styles
  Object.assign(select.style, {
    width: "100%",
    padding: "6px",
    marginBottom: "10px",
    ...styles,
  });

  // Apply any additional HTML attributes (e.g. id, name, data-* props)
  Object.entries(attributes).forEach(([key, val]) => {
    select.setAttribute(key, val);
  });

  return select;
}

export function populateSelectOptions(
  selectElement,
  options = [],
  selectedValue = ""
) {
  selectElement.innerHTML = "";

  options.forEach(({ value, label, disabled = false }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.disabled = disabled;
    if (value === selectedValue) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

export function focusFirstInput(
  container,
  selector = 'input[name="title"], input, select, textarea'
) {
  const firstInput = container.querySelector(selector);
  if (firstInput) {
    firstInput.focus();
    log("[UI] Focused first input.");
  } else {
    warn("[UI] No input to focus.");
  }
}

export function wrapInputWithLabel(inputElement, labelText) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-row";

  const label = document.createElement("label");
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(inputElement);
  return wrapper;
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

export function enableElementResizing(target, grip, { minWidth = 300, minHeight = 200 } = {}) {
  let isResizing = false;

  grip.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = target.offsetWidth;
    const startHeight = target.offsetHeight;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      target.style.width = `${Math.max(newWidth, minWidth)}px`;
      target.style.height = `${Math.max(newHeight, minHeight)}px`;
    };

    const onMouseUp = () => {
      isResizing = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

export function enableEscToClose(onEscape) {
  const handler = (e) => {
    if (e.key === "Escape") onEscape();
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

export function applyModalCssClass(modalEl, typeDef) {
  if (!modalEl) return;

  modalEl.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modalEl.classList.remove(cls);
    }
  });

  if (typeDef?.cssClass) {
    modalEl.classList.add(typeDef.cssClass);
  }
}
