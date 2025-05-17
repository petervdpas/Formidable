// modules/handlers/contextHandlers.js

import { setContextView } from "../contextManager.js";
import { EventBus } from "../eventBus.js";

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

  if (toggle && toggle.checked !== isStorage) toggle.checked = isStorage;
  if (menuToggle && menuToggle.checked !== isStorage)
    menuToggle.checked = isStorage;

  setContextView(mode, containers);
  await window.api.config.updateUserConfig({ context_mode: mode });

  if (mode === "storage") {
    await dropdown?.refresh?.();

    const currentName = window.currentSelectedTemplateName;
    if (currentName && dropdown?.setSelected) {
      dropdown.setSelected(currentName);
    }
  }

  if (mode === "template") {
    const selectedTemplate = window.currentSelectedTemplateName;
    if (selectedTemplate) {
      const yaml = await window.api.templates.loadTemplate(selectedTemplate);
      EventBus.emit("template:selected", { name: selectedTemplate, yaml });
    }
  }

  EventBus.emit("status:update", `Context set to ${mode}`);
}
