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
