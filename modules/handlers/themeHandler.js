// modules/handlers/themeHandler.js
import { EventBus } from "../eventBus.js";
import {
  applyThemeLinks,
  setCodeMirrorTheme,
  setCurrentTheme,
} from "../../utils/themeUtils.js";

export async function handleThemeToggle(theme) {
  const root = document.documentElement;
  const next = String(theme || "").trim().toLowerCase() || "light";

  root.dataset.theme = next;
  for (const cls of Array.from(root.classList)) {
    if (cls.startsWith("theme-")) root.classList.remove(cls);
  }
  root.classList.add(`theme-${next}`);

  applyThemeLinks(next);
  setCodeMirrorTheme(next);
  setCurrentTheme(next);

  // persist
  try { localStorage.setItem("theme", next); } catch {}
  await window.api.config.updateUserConfig({ theme: next });

  EventBus.emit("status:update", {
    languageKey: "status.basic.setTo",
    i18nEnabled: true,
    args: ["config.theme", next],
    variant: /\bdark\b/i.test(next) ? "warning" : "default",
  });
}