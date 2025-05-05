// modules/handlers/templateHandlers.js

import { EventBus } from "../eventBus.js";
import { log } from "../../utils/logger.js";

let formManager = null;
let metaListManager = null;

// 🔗 Inject dependencies from renderer.js
export function bindTemplateDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
}

export async function handleTemplateSelected({ name, yaml }) {
  log("[Handler] template:selected received:", name);

  window.currentSelectedTemplateName = name;
  window.currentSelectedTemplate = yaml;

  const config = await window.api.config.loadUserConfig();
  const templateChanged = config.selected_template !== name;

  await window.api.config.updateUserConfig({ selected_template: name });

  if (templateChanged) {
    EventBus.emit("form:selected", null); 
    EventBus.emit("form:clear");
  }

  const listItem = Array.from(
    document.querySelectorAll("#template-list .template-item")
  ).find(
    (el) =>
      el.textContent.trim().toLowerCase() ===
      name.replace(/\.yaml$/, "").toLowerCase()
  );

  if (listItem) {
    document.querySelectorAll("#template-list .template-item.selected")
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
