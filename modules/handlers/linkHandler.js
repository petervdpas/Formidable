// modules/handlers/linkHandler.js

import { EventBus } from "../eventBus.js";
import { highlightAndClickForm } from "../../utils/domUtils.js";

let dropdown = null;
let selectTemplateFn = null;

export function bindLinkDependencies(deps) {
  dropdown = deps.dropdown;
  selectTemplateFn = deps.selectTemplate;
}

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
export async function handleFormidableNavigate(data) {
  if (!data || typeof data !== "object") return;

  const { link, template, entry } = data;

  EventBus.emit("logging:default", [
    "[LinkHandler] Navigating formidable link:",
    link,
    "→ template:",
    template,
    "→ entry:",
    entry,
  ]);

  // Load the template first
  const yaml = await new Promise((resolve) => {
    EventBus.emit("template:load", { name: template, callback: resolve });
  });

  if (!yaml) {
    EventBus.emit("status:update", `Failed to load template: ${template}`);
    return;
  }

  await selectTemplateFn(template);

  if (entry) {
    highlightAndClickForm(entry);
  }
}
