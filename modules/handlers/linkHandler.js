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
  const yaml = await EventBus.emitWithResponse("template:load", {
    name: template,
  });

  if (!yaml) {
    EventBus.emit("status:update", {
      message: "status.template.load.failed",
      languageKey: "status.template.load.failed",
      i18nEnabled: true,
      args: [template],
    });
    return;
  }

  await selectTemplateFn(template);

  if (entry) {
    highlightAndClickForm(entry);
  }
}
