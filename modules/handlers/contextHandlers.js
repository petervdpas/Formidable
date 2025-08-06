// modules/handlers/contextHandlers.js

import { EventBus } from "../eventBus.js";
import { setContextView } from "../contextManager.js";

let containers, dropdown;

export function bindContextDependencies(deps) {
  containers = deps.containers;
  dropdown = deps.dropdown;
}

export async function handleContextToggle(isStorage) {
  const mode = isStorage ? "storage" : "template";
  EventBus.emit("logging:default", ["[Handler] Context toggled:", mode]);

  const toggle = document.getElementById("context-toggle");
  const menuToggle = document.getElementById("context-toggle-menu");

  if (toggle && toggle.checked !== isStorage) {
    toggle.checked = isStorage;
    toggle.dispatchEvent(new Event("change"));
  }
  if (menuToggle && menuToggle.checked !== isStorage) {
    menuToggle.checked = isStorage;
    menuToggle.dispatchEvent(new Event("change"));
  }

  setContextView(mode, containers);

  EventBus.emit("config:update", { context_mode: mode });

  if (mode === "storage") {
    await dropdown?.refresh?.();

    const currentName = window.currentSelectedTemplateName;
    if (currentName && dropdown?.setSelected) {
      dropdown.setSelected(currentName);
    }
  }

  if (mode === "template") {
    const selectedTemplate = window.currentSelectedTemplateName;

    // Avoid refiring if it's already applied (idempotent)
    const config = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });

    // only if not already applied
    if (selectedTemplate && selectedTemplate !== config.selected_template) {
      const { selectTemplate } = await import("../utils/templateSelector.js");
      await selectTemplate(selectedTemplate);
    } else {
      EventBus.emit("logging:default", [
        "[ContextToggle] Skipping redundant selectTemplate for:",
        selectedTemplate,
      ]);
    }
  }

  EventBus.emit("status:update", {
    message: `status.context.set.${mode}`,
    languageKey: `status.context.set.${mode}`,
    i18nEnabled: true,
  });
}
