// modules/uiBehaviors.js

import { EventBus } from "./eventBus.js";
import { log, warn } from "./logger.js";

// Theme toggle logic
export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    EventBus.emit("theme:toggle", isDark ? "dark" : "light");
  });

  EventBus.on("theme:toggle", async (theme) => {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    if (toggleElement) toggleElement.checked = isDark;

    await window.api.config.updateUserConfig({ theme });
    EventBus.emit("status:update", `Theme set to ${isDark ? "Dark" : "Light"}`);
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
