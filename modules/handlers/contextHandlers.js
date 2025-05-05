// modules/handlers/contextHandlers.js

import { setContextView } from "../contextManager.js";
import { EventBus } from "../eventBus.js";
import { log } from "../logger.js";

let containers, dropdown;

export function bindContextDependencies(deps) {
  containers = deps.containers;
  dropdown = deps.dropdown;
}

export async function handleContextToggle(isMarkdown) {
  const mode = isMarkdown ? "markdown" : "template";
  log("[Handler] Context toggled:", mode);

  const toggle = document.getElementById("context-toggle");
  const menuToggle = document.getElementById("context-toggle-menu");

  if (toggle && toggle.checked !== isMarkdown) toggle.checked = isMarkdown;
  if (menuToggle && menuToggle.checked !== isMarkdown) menuToggle.checked = isMarkdown;

  setContextView(mode, containers);
  await window.api.config.updateUserConfig({ context_mode: mode });

  if (mode === "markdown") {
    await dropdown?.refresh?.();

    const currentName = window.currentSelectedTemplateName;
    if (currentName && dropdown?.setSelected) {
      dropdown.setSelected(currentName);
    }
  }

  EventBus.emit("status:update", `Context set to ${mode}`);
}

export async function handleTemplateSelected({ name, yaml }) {
  window.currentSelectedTemplateName = name;
  window.currentSelectedTemplate = yaml;
  await window.api.config.updateUserConfig({ selected_template: name });
}

export async function handleFormSelected(filename) {
  await window.api.config.updateUserConfig({ selected_data_file: filename });
}
