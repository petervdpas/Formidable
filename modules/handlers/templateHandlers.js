// modules.handlers/templateHandlers.js

import { log } from "../logger.js";

export function handleTemplateSelected({ name, yaml }) {
  log("[Handler] template:selected received:", name);

  window.currentSelectedTemplateName = name;
  window.currentSelectedTemplate = yaml;

  const listItem = Array.from(
    document.querySelectorAll("#template-list .template-item")
  ).find(
    (el) =>
      el.textContent.trim().toLowerCase() ===
      name.replace(/\.yaml$/, "").toLowerCase()
  );

  if (listItem && !listItem.classList.contains("selected")) {
    listItem.click(); // simulate selection to trigger sidebar visuals
  }
}
