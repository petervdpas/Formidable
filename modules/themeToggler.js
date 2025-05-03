// modules/themeToggler.js

import { EventBus } from "./eventBus.js";

export function initThemeToggle(toggleElement) {
  
  toggleElement.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    EventBus.emit("theme:set", isDark ? "dark" : "light");
  });

  EventBus.on("theme:set", async (theme) => {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);

    if (toggleElement) toggleElement.checked = isDark;

    await window.api.config.updateUserConfig({ theme });

    EventBus.emit("status:update", `Theme set to ${isDark ? "Dark" : "Light"}`);
  });
}

