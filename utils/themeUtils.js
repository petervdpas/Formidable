// utils/themeUtils.js

/**
 * Enable the correct theme stylesheet link element.
 * Expects <link id="formidable-theme-light"> and <link id="formidable-theme-dark">
 */
export function applyThemeLinks(mode) {
  const light = document.getElementById("formidable-theme-light");
  const dark  = document.getElementById("formidable-theme-dark");
  if (light) light.disabled = mode !== "light";
  if (dark)  dark.disabled  = mode !== "dark";
}

/**
 * Set CodeMirror theme dynamically for all active instances
 */
export function setCodeMirrorTheme(mode) {
  const filename = mode === "dark" ? "monokai.css" : "eclipse.css";
  const link = document.getElementById("cm-theme");
  if (link) link.href = `assets/codemirror/${filename}`;

  document.querySelectorAll(".CodeMirror").forEach((cmEl) => {
    const cm = cmEl.CodeMirror;
    if (cm) {
      cm.setOption("theme", mode === "dark" ? "monokai" : "eclipse");
      cm.refresh();
    }
  });
}

/**
 * Track the current theme globally
 */
let currentTheme = "dark";

export function setCurrentTheme(mode) {
  currentTheme = mode;
}

export function getCurrentTheme() {
  return currentTheme;
}
