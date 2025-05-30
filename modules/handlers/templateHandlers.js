// modules/handlers/templateHandlers.js

import { EventBus } from "../eventBus.js";

let formManager = null;
let metaListManager = null;
let templateEditor = null;

// 🔗 Inject dependencies from renderer.js
export function bindTemplateDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
  templateEditor = deps.templateEditor;
}

export async function handleTemplateSelected({ name, yaml }) {
  EventBus.emit("logging:default", [
    "[Handler] context:select:template received:",
    name,
  ]);

  window.currentSelectedTemplateName = name;
  window.currentSelectedTemplate = yaml;

  if (templateEditor) {
    templateEditor.render(yaml);
  }

  const config = await window.api.config.loadUserConfig();
  const templateChanged = config.selected_template !== name;

  await window.api.config.updateUserConfig({ selected_template: name });

  if (templateChanged) {
    EventBus.emit("context:select:form", null);
  }

  const listItem = Array.from(
    document.querySelectorAll("#template-list .template-item")
  ).find(
    (el) =>
      el.textContent.trim().toLowerCase() ===
      name.replace(/\.yaml$/, "").toLowerCase()
  );

  if (listItem) {
    document
      .querySelectorAll("#template-list .template-item.selected")
      .forEach((el) => el.classList.remove("selected"));
    listItem.classList.add("selected");
  }

  if (formManager && metaListManager) {
    await formManager.loadTemplate(yaml);
    await metaListManager.loadList();

    const config = await window.api.config.loadUserConfig();
    if (config.selected_data_file) {
      EventBus.emit("form:list:highlighted", config.selected_data_file);
    }
  }
}
