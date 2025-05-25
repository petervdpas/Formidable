// modules/menuManager.js

import { EventBus } from "./eventBus.js";
import { bindActionHandlers } from "../utils/domUtils.js";

export function buildMenu(containerId = "app-menu", commandHandler) {
  const container = document.getElementById(containerId);

  if (!container) {
    EventBus.emit("logging:warning", [
      `[Menu] No element found with ID: "${containerId}"`,
    ]);
    return;
  }

  if (typeof commandHandler !== "function") {
    EventBus.emit("logging:error", [
      "[Menu] Invalid or missing command handler.",
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    `[Menu] Building menu in container: #${containerId}`,
  ]);

  container.innerHTML = `
    <ul class="menu-bar">
      <li class="menu-item">File
        <ul class="submenu">
          <li data-action="open-template-folder">Open Template Folder</li>
          <li data-action="open-storage-folder">Open Storage Folder</li>
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
      <li class="menu-item" id="menu-context-toggle" style="display: flex; align-items: center; gap: 6px;">
        <span>Context Mode:</span>
        <label class="switch" title="Toggle Form Input Mode">
          <input type="checkbox" id="context-toggle-menu" />
          <span class="slider"></span>
        </label>
      </li>
    </ul>
  `;

  bindActionHandlers(container, "[data-action]", commandHandler);

  const contextToggle = container.querySelector("#context-toggle-menu");
  if (contextToggle) {
    contextToggle.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      EventBus.emit("logging:default", [
        `[Menu] Context toggle changed: ${isChecked}`,
      ]);
      EventBus.emit("context:toggle", isChecked);
    });

    // Initial config sync
    window.api.config.loadUserConfig().then((config) => {
      const mode = config.context_mode || "template";
      const isChecked = mode === "storage";
      contextToggle.checked = isChecked;
    });
  }

  EventBus.emit("logging:default", ["[Menu] Menu setup complete."]);
}

export async function handleMenuAction(action) {
  EventBus.emit("logging:default", [`[Menu] Handling menu action: ${action}`]);

  switch (action) {
    case "open-template-folder": {
      const config = await window.api.config.loadUserConfig();
      const resolved = await window.api.system.resolvePath(
        config.templates_location || "templates"
      );
      await window.api.markdown.ensureMarkdownDir?.(resolved);
      const result = await window.electron.shell.openPath(resolved);
      if (result) {
        EventBus.emit("logging:error", [
          "[Shell] Failed to open template folder:",
          result,
        ]);
      } else {
        EventBus.emit("logging:default", [
          "[Shell] Opened template folder:",
          resolved,
        ]);
      }
      break;
    }

    case "open-storage-folder": {
      try {
        const config = await window.api.config.loadUserConfig();
        const templateName = config.selected_template;
        if (!templateName) {
          EventBus.emit("logging:warning", [
            "[Menu] No selected_template entry found.",
          ]);
          return;
        }

        const templatePath = await window.api.system.resolvePath(
          "templates",
          templateName
        );
        const exists = await window.api.system.fileExists(templatePath);
        if (!exists) {
          EventBus.emit("logging:error", [
            "[Menu] Template not found:",
            templatePath,
          ]);
          return;
        }

        const yaml = await window.api.templates.loadTemplate(templateName);
        const targetPath = await window.api.system.resolvePath(
          yaml.storage_location
        );
        await window.api.forms.ensureFormDir?.(targetPath);

        const result = await window.electron.shell.openPath(targetPath);
        if (result) {
          EventBus.emit("logging:error", [
            "[Shell] Failed to open storage folder:",
            result,
          ]);
        } else {
          EventBus.emit("logging:default", [
            "[Shell] Opened storage folder:",
            targetPath,
          ]);
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Menu] Failed to open storage folder:",
          err,
        ]);
      }
      break;
    }

    case "quit":
      EventBus.emit("logging:default", ["[Menu] Quitting app..."]);
      window.electron.app.quit();
      break;

    case "open-settings":
      EventBus.emit("logging:default", ["[Menu] Opening settings modal..."]);
      window.openSettingsModal?.();
      break;

    case "reload":
      EventBus.emit("logging:default", ["[Menu] Reloading page..."]);
      location.reload();
      break;

    case "devtools":
      EventBus.emit("logging:default", ["[Menu] Toggling devtools..."]);
      window.electron.devtools.toggle();
      break;

    case "about":
      EventBus.emit("logging:default", ["[Menu] Opening about modal..."]);
      window.openAboutModal?.();
      break;

    default:
      EventBus.emit("logging:warning", [`[Menu] Unhandled action: ${action}`]);
  }
}
