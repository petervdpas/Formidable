// modules/handlers/themeHandler.js

import { EventBus } from "../eventBus.js";
import { setCodeMirrorTheme } from "../themeToggle.js";

export async function handleThemeToggle(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);

  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.checked = isDark;

  setCodeMirrorTheme(theme);

  await window.api.config.updateUserConfig({ theme });
  
  EventBus.emit("status:update", {
    message: `status.theme.set.${isDark ? "dark" : "light"}`,
    languageKey: `status.theme.set.${isDark ? "dark" : "light"}`,
    i18nEnabled: true,
    variant: isDark ? "warning" : "default",
  });
}
