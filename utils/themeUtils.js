// utils/themeUtils.js

/**
 * Enable the correct theme stylesheet link element.
 */
export function applyThemeLinks(mode) {
  const prefix = "formidable-theme-";
  const links = Array.from(document.querySelectorAll(`link[id^="${prefix}"]`));
  for (const l of links) {
    const idMode = l.id.slice(prefix.length);
    l.disabled = idMode !== mode;
  }
}

/**
 * Set CodeMirror theme dynamically for all active instances
 */
export function setCodeMirrorTheme(mode) {
  const filename = mode === "dark" ? "monokai.css" : "eclipse.css";
  const link = document.getElementById("cm-theme");
  if (link) link.href = `assets/codemirror/${filename}`;
  document.querySelectorAll(".CodeMirror").forEach((el) => {
    const cm = el.CodeMirror;
    if (cm) {
      cm.setOption("theme", mode === "dark" ? "monokai" : "eclipse");
      cm.refresh();
    }
  });
}

/**
 * Track the current theme globally
 */
let currentTheme = "light";

export function setCurrentTheme(mode) {
  currentTheme = mode;
}

export function getCurrentTheme() {
  return currentTheme;
}
