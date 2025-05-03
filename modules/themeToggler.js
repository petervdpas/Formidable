// modules/themeToggler.js

import { EventBus } from "./eventBus.js";

export function initThemeToggle(toggleElement) {
  toggleElement.addEventListener("change", async (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark-mode", isDark);
    await window.api.config.updateUserConfig({
      theme: isDark ? "dark" : "light",
    });
    EventBus.emit("status:update", `Theme set to ${isDark ? "Dark" : "Light"}`);
  });
}

export async function applyInitialTheme(config) {
  const isDark = config.theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
}
