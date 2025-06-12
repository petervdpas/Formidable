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

  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });
  const templateChanged = config.selected_template !== name;

  if (templateChanged) {
    EventBus.emit("config:update", { selected_template: name });

    // Only needed when entering storage mode for the first time
    // await window.api.markdown.ensureMarkdownDir(yaml.storage_location);

    // Clear form selection when switching template
    EventBus.emit("context:select:form", null);
  }

  if (formManager && metaListManager) {
    await formManager.loadTemplate(yaml);
    await metaListManager.loadList();

    const config = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });
    const lastDataFile = config.selected_data_file;

    if (lastDataFile) {
      EventBus.emit("form:list:highlighted", lastDataFile);
    }
  }

  const el = document.querySelector(`#template-list [data-value="${name}"]`);
  if (!el || !el.classList.contains("selected")) {
    EventBus.emit("template:list:highlighted", name);
  }
}
