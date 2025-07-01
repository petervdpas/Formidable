// modules/menuManager.js

import { EventBus } from "./eventBus.js";
import { bindActionHandlers } from "../utils/domUtils.js";
import { createSwitch } from "../utils/elementBuilders.js";

let cachedConfig = null;
let pluginMap = new Map(); // name → pluginMeta

export async function buildMenu(containerId = "app-menu", commandHandler) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof commandHandler !== "function") {
    EventBus.emit("logging:error", [
      "[Menu] Invalid or missing command handler.",
    ]);
    return;
  }

  // Load config if not cached
  cachedConfig =
    cachedConfig ||
    (await new Promise((resolve) => {
      EventBus.emit("config:load", resolve);
    }));

  // Reset plugin map
  pluginMap.clear();

  const menuBar = document.createElement("ul");
  menuBar.className = "menu-bar";

  // ─── File & Config Menu ─────────────────────
  menuBar.append(
    createMenuGroup("File", [
      { label: "Open Template Folder", action: "open-template-folder" },
      { label: "Open Storage Folder", action: "open-storage-folder" },
      "separator",
      { label: "Quit", action: "quit" },
    ]),
    createMenuGroup("Config", [
      { label: "Switch Profile...", action: "open-profile-switcher" },
      { label: "Settings...", action: "open-settings" },
      { label: "Workspace...", action: "open-workspace-settings" },
    ])
  );

  // ─── Git Menu ────────────────────────────────
  if (cachedConfig.use_git) {
    menuBar.append(
      createMenuGroup("Git", [
        { label: "Git Actions...", action: "open-git-modal" },
      ])
    );
  }

  // ─── Server Menu ─────────────────────────────
  if (cachedConfig.enable_internal_server) {
    menuBar.append(
      createMenuGroup("Server", [
        { label: "Start Server", action: "start-internal-server" },
        { label: "Stop Server", action: "stop-internal-server" },
        { label: "Server Status", action: "get-internal-server-status" },
      ])
    );
  }

  // ─── Plugins Menu ────────────────────────────
  const pluginItems = [
    { label: "Plugin Manager...", action: "open-plugin-manager" },
  ];

  const plugins = await EventBus.emitWithResponse("plugin:list", null);
  pluginMap = new Map(plugins.map((p) => [p.name, p])); // ✅ cache plugin meta

  if (plugins?.length) {
    pluginItems.push("separator");

    for (const plugin of plugins) {
      pluginItems.push({
        label: plugin.name,
        action: `plugin:run:${plugin.name}`,
      });
    }
  }

  menuBar.append(createMenuGroup("Plugins", pluginItems));

  // ─── View, Help, Context Toggle ───────────────
  menuBar.append(
    createMenuGroup("View", [
      { label: "Reload", action: "reload" },
      { label: "Toggle DevTools", action: "devtools" },
    ]),
    createMenuGroup("Help", [{ label: "About", action: "about" }]),
    createContextToggleItem()
  );

  // ─── Finalize ────────────────────────────────
  container.innerHTML = "";
  container.appendChild(menuBar);
  bindActionHandlers(container, "[data-action]", commandHandler);

  EventBus.emit("logging:default", ["[Menu] Menu setup complete."]);
}

// Export pluginMap so it can be used in handleMenuAction
export function getPluginMeta(name) {
  return pluginMap.get(name) || null;
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

  const { templatesPath: templatesLocation } = await new Promise((resolve) => {
    EventBus.emit("config:context:paths", { callback: resolve });
  });

  // Handle plugin:run:pluginName
  if (action.startsWith("plugin:run:")) {
    const pluginName = action.split(":")[2];
    EventBus.emit("logging:default", [`[Menu] Running plugin: ${pluginName}`]);

    const pluginMeta = getPluginMeta(pluginName);
    const target = pluginMeta?.target || "backend";

    EventBus.emit("plugin:run", { name: pluginName, target });
    return;
  }

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
          templatesLocation,
        ]);
      }
      break;
    }

    case "open-storage-folder": {
      try {
        const config = await new Promise((resolve) => {
          EventBus.emit("config:load", (cfg) => resolve(cfg));
        });
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

        const templateStorageLocation = await new Promise((resolve) => {
          EventBus.emit("config:template:storagePath", {
            templateFilename: templateName,
            callback: resolve,
          });
        });
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

    case "open-profile-switcher":
      EventBus.emit("logging:default", [
        "[Menu] Opening profile switcher modal...",
      ]);
      window.openProfileModal?.();
      break;

    case "open-plugin-manager":
      EventBus.emit("logging:default", ["[Menu] Opening plugin manager..."]);
      window.openPluginModal?.();
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

    case "open-git-modal":
      EventBus.emit("logging:default", ["[Menu] Opening Git modal..."]);
      window.openGitModal?.();
      break;

    case "start-internal-server":
      EventBus.emit("logging:default", ["[Menu] Starting internal server..."]);
      {
        const port = cachedConfig?.internal_server_port || 8383;
        EventBus.emit("server:start", { port });
      }
      break;

    case "stop-internal-server":
      EventBus.emit("logging:default", ["[Menu] Stopping internal server..."]);
      EventBus.emit("server:stop");
      break;

    case "get-internal-server-status":
      EventBus.emit("logging:default", [
        "[Menu] Getting internal server status...",
      ]);
      EventBus.emit("server:status", {
        callback: (server) => {
          console.log("[Menu] Server status:", server);
          EventBus.emit("ui:toast", {
            message: `Server: ${
              server.running ? "Running" : "Stopped"
            } on port ${server.port || "-"}`,
            variant: server.running ? "success" : "info",
          });
        },
      });
      break;

    case "about":
      EventBus.emit("logging:default", ["[Menu] Opening about modal..."]);
      window.openAboutModal?.();
      break;

    default:
      EventBus.emit("logging:warning", [`[Menu] Unhandled action: ${action}`]);
  }
}
