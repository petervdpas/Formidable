// modules/themeToggle.js

import { EventBus } from "../modules/eventBus.js";

// Theme toggle logic
export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    EventBus.emit("theme:toggle", isDark ? "dark" : "light");
  });
}

export function setCodeMirrorTheme(mode) {
  const link = document.getElementById("cm-theme");
  if (!link) return;

  const filename = mode === "dark" ? "monokai.css" : "eclipse.css";
  link.href = `assets/codemirror/${filename}`;
}
