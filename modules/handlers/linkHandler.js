// modules/handlers/linkHandler.js

import { EventBus } from "../eventBus.js";

// ─── External Link ────────────────────────────────────────────
export function handleExternalLinkOpen(url) {
  if (typeof url !== "string" || url.trim() === "") {
    EventBus.emit("logging:warning", [
      "[LinkHandler] Invalid external link:",
      url,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    "[LinkHandler] Opening external link:",
    url,
  ]);

  window.api.system.openExternal(url);
}

// ─── Formidable Navigate Link ─────────────────────────────────
export function handleFormidableNavigate(data) {
  if (!data || typeof data !== "object") return;

  const { link, template, entry } = data;

  EventBus.emit("logging:default", [
    "[LinkHandler] Navigating formidable link:",
    link,
    "→ template:", template,
    "→ entry:", entry,
  ]);

  // You can emit your navigation logic here:
  EventBus.emit("template:selected", template);
  EventBus.emit("form:selected", entry);
}
