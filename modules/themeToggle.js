// modules/themeToggle.js

import { EventBus } from "../modules/eventBus.js";

let currentTheme = "dark";

// Theme toggle logic
export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    EventBus.emit("theme:toggle", isDark ? "dark" : "light");
  });
}

export function setCodeMirrorTheme(mode) {
  const filename = mode === "dark" ? "monokai.css" : "eclipse.css";
  const link = document.getElementById("cm-theme");
  if (link) {
    link.href = `assets/codemirror/${filename}`;
  }

  // Apply to any active CodeMirror instances
  const allEditors = document.querySelectorAll(".CodeMirror");
  allEditors.forEach((cmEl) => {
    const cm = cmEl.CodeMirror;
    if (cm) {
      cm.setOption("theme", mode === "dark" ? "monokai" : "eclipse");
      cm.refresh();
    }
  });

  currentTheme = mode;
}

export function getCurrentTheme() {
  return currentTheme;
}
