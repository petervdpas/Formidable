// modules/menuManager.js

import { log, warn, error } from "./logger.js";

export function buildMenu(containerId = "app-menu", commandHandler) {
  const container = document.getElementById(containerId);

  if (!container) {
    warn(`[Menu] No element found with ID: "${containerId}"`);
    return;
  }

  if (typeof commandHandler !== "function") {
    error("[Menu] Invalid or missing command handler.");
    return;
  }

  log(`[Menu] Building menu in container: #${containerId}`);

  container.innerHTML = `
    <ul class="menu-bar">
      <li class="menu-item">File
        <ul class="submenu">
          <li data-action="open-template-folder">Open Template Folder</li>
          <li data-action="open-markdown-folder">Open Markdown Folder</li>
          <li class="separator"></li>
          <li data-action="quit">Quit</li>
        </ul>
      </li>
      <li class="menu-item">Config
        <ul class="submenu">
          <li data-action="open-settings">Settings...</li>
        </ul>
      </li>
      <li class="menu-item">View
        <ul class="submenu">
          <li data-action="reload">Reload</li>
          <li data-action="devtools">Toggle DevTools</li>
        </ul>
      </li>
      <li class="menu-item">Help
        <ul class="submenu">
          <li data-action="about">About</li>
        </ul>
      </li>
    </ul>
  `;

  container.querySelectorAll("[data-action]").forEach((item) => {
    const action = item.getAttribute("data-action");
    log(`[Menu] Binding handler for: ${action}`);
    item.addEventListener("click", () => {
      log(`[Menu] Triggered action: ${action}`);
      commandHandler(action);
    });
  });

  log("[Menu] Menu setup complete.");
}
