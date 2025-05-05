// modules/handlers/templateHandlers.js

import { EventBus } from "../eventBus.js";
import { log } from "../logger.js";

let formManager = null;
let metaListManager = null;

// 🔗 Inject dependencies from renderer.js
export function bindTemplateDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
}

export function handleTemplateSelected({ name, yaml }) {
  log("[Handler] template:selected received:", name);

  window.currentSelectedTemplateName = name;
  window.currentSelectedTemplate = yaml;

  EventBus.emit("form:selected", null); // clear form data

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

  // ✅ Now trigger load only from here
  if (formManager && metaListManager) {
    formManager.loadTemplate(yaml);
    metaListManager.loadList(); // reload metadata
  }
}
