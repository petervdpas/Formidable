// modules/themeToggler.js

import { updateStatus } from "./statusManager.js";

export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", async (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark-mode", isDark);
    await window.configAPI.updateUserConfig({
      theme: isDark ? "dark" : "light",
    });
    updateStatus(`Theme set to ${isDark ? "Dark" : "Light"}`);
  });
}

export async function applyInitialTheme(config) {
  const isDark = config.theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
}
