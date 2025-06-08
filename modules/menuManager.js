// modules/menuManager.js

import { EventBus } from "./eventBus.js";
import { bindActionHandlers } from "../utils/domUtils.js";
import { createSwitch } from "../utils/elementBuilders.js";

let cachedConfig = null;

export async function buildMenu(containerId = "app-menu", commandHandler) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof commandHandler !== "function") {
    EventBus.emit("logging:error", [
      "[Menu] Invalid or missing command handler.",
    ]);
    return;
  }

  cachedConfig = cachedConfig || (await window.api.config.loadUserConfig());

  const menuBar = document.createElement("ul");
  menuBar.className = "menu-bar";

  // Menu structure
  menuBar.append(
    createMenuGroup("File", [
      { label: "Open Template Folder", action: "open-template-folder" },
      { label: "Open Storage Folder", action: "open-storage-folder" },
      "separator",
      { label: "Quit", action: "quit" },
    ]),
    createMenuGroup("Config", [
      { label: "Settings...", action: "open-settings" },
      { label: "Workspace...", action: "open-workspace-settings" },
    ]),
    createMenuGroup("View", [
      { label: "Reload", action: "reload" },
      { label: "Toggle DevTools", action: "devtools" },
    ]),
    createMenuGroup("Help", [{ label: "About", action: "about" }]),
    createContextToggleItem()
  );

  container.innerHTML = "";
  container.appendChild(menuBar);

  bindActionHandlers(container, "[data-action]", commandHandler);

  EventBus.emit("logging:default", ["[Menu] Menu setup complete."]);
}

function createMenuGroup(title, items) {
  const li = document.createElement("li");
  li.className = "menu-item";
  li.textContent = title;

  const submenu = document.createElement("ul");
  submenu.className = "submenu";

  for (const item of items) {
    const child = document.createElement("li");
    if (item === "separator") {
      child.className = "separator";
    } else {
      child.textContent = item.label;
      child.dataset.action = item.action;
    }
    submenu.appendChild(child);
  }

  li.appendChild(submenu);
  return li;
}

function createContextToggleItem() {
  const li = document.createElement("li");
  li.className = "menu-item";
  li.id = "menu-context-toggle";

  const isStorage = cachedConfig?.context_mode === "storage";
  const toggle = createSwitch(
    "context-toggle-menu",
    "Context Mode:",
    isStorage,
    (checked) => {
      EventBus.emit("logging:default", [
        `[Menu] Context toggle changed: ${checked}`,
      ]);
      EventBus.emit("context:toggle", checked);
    },
    "inline",
    ["Storage", "Template"]
  );

  li.appendChild(toggle);
  return li;
}

export async function handleMenuAction(action) {
  EventBus.emit("logging:default", [`[Menu] Handling menu action: ${action}`]);

  const templatesLocation = await window.api.config.getTemplatesFolder();

  switch (action) {
    case "open-template-folder": {
      const result = await window.electron.shell.openPath(templatesLocation);
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
        // TODO: Reevaluate if virtualstructure is needed here
        if (!templateName) {
          EventBus.emit("logging:warning", [
            "[Menu] No selected_template entry found.",
          ]);
          EventBus.emit("ui:toast", {
            message: "No template selected. Please select a template first.",
            variant: "warning",
          });
          return;
        }

        const templateStorageLocation =
          await window.api.config.getTemplateStorageFolder(templateName);
        const result = await window.electron.shell.openPath(
          templateStorageLocation
        );
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

    case "open-workspace-settings":
      EventBus.emit("logging:default", ["[Menu] Opening workspace modal..."]);
      window.openWorkspaceModal?.();
      break;

    case "about":
      EventBus.emit("logging:default", ["[Menu] Opening about modal..."]);
      window.openAboutModal?.();
      break;

    default:
      EventBus.emit("logging:warning", [`[Menu] Unhandled action: ${action}`]);
  }
}
