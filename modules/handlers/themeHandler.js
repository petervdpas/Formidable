// modules/handlers/themeHandler.js
import { EventBus } from "../eventBus.js";
import {
  applyThemeLinks,
  setCodeMirrorTheme,
  setCurrentTheme,
} from "../../utils/themeUtils.js";

export async function handleThemeToggle(theme) {
  const isDark = theme === "dark";
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.classList.toggle("theme-dark", isDark);
  root.classList.toggle("theme-light", !isDark);

  applyThemeLinks(theme);
  setCodeMirrorTheme(theme);
  setCurrentTheme(theme);

  try {
    localStorage.setItem("theme", theme);
  } catch {}

  await window.api.config.updateUserConfig({ theme });
  EventBus.emit("status:update", {
    message: `status.theme.set.${isDark ? "dark" : "light"}`,
    languageKey: `status.theme.set.${isDark ? "dark" : "light"}`,
    i18nEnabled: true,
    variant: isDark ? "warning" : "default",
  });
}
