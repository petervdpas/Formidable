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

  // Always highlight the correct sidebar item
  EventBus.emit("template:list:highlighted", {
    listId: "template-list",
    name,
  });

  if (templateChanged) {
    EventBus.emit("context:select:form", null);
  }

  if (formManager && metaListManager) {
    await formManager.loadTemplate(yaml);
    await metaListManager.loadList();

    const updated = await window.api.config.loadUserConfig();
    if (updated.selected_data_file) {
      EventBus.emit("form:list:highlighted", {
        listId: "storage-list",
        name: updated.selected_data_file,
      });
    }
  }
}
