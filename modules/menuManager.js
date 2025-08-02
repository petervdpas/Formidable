// modules/menuManager.js

import { EventBus } from "./eventBus.js";
import { bindActionHandlers } from "../utils/domUtils.js";
import { createSwitch } from "../utils/elementBuilders.js";
import { t } from "../utils/i18n.js";

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
    createMenuGroup("menu.file", [
      { label: "menu.file.openTemplateFolder", action: "open-template-folder" },
      { label: "menu.file.openStorageFolder", action: "open-storage-folder" },
      { label: "menu.file.openPluginsFolder", action: "open-plugins-folder" },
      "separator",
      { label: "menu.file.quit", action: "quit" },
    ]),
    createMenuGroup("menu.config", [
      { label: "menu.config.switchProfile", action: "open-profile-switcher" },
      { label: "menu.config.settings", action: "open-settings" },
      { label: "menu.config.workspace", action: "open-workspace-settings" },
    ])
  );

  // ─── Git Menu ────────────────────────────────
  if (cachedConfig.use_git) {
    menuBar.append(
      createMenuGroup("menu.git", [
        { label: "menu.git.actions", action: "open-git-modal" },
      ])
    );
  }

  // ─── Server Menu ─────────────────────────────
  if (cachedConfig.enable_internal_server) {
    menuBar.append(
      createMenuGroup("menu.server", [
        { label: "menu.server.start", action: "start-internal-server" },
        { label: "menu.server.stop", action: "stop-internal-server" },
        { label: "menu.server.status", action: "get-internal-server-status" },
        {
          label: "menu.server.browser",
          action: "open-internal-server-browser",
        },
      ])
    );
  }

  // ─── Plugins Menu ────────────────────────────
  if (cachedConfig.enable_plugins) {
    const pluginItems = [
      { label: "menu.plugins.manager", action: "open-plugin-manager" },
    ];

    const plugins = await EventBus.emitWithResponse("plugin:list", null);
    pluginMap = new Map(plugins.map((p) => [p.name, p]));

    if (plugins?.length) {
      const enabledPlugins = plugins.filter((p) => p.enabled);
      if (enabledPlugins.length) {
        pluginItems.push("separator");
        for (const plugin of enabledPlugins) {
          pluginItems.push({
            label: plugin.name,
            action: `plugin:run:${plugin.name}`,
          });
        }
      }
    }

    menuBar.append(createMenuGroup("menu.plugins", pluginItems));
  }

  // ─── View, Help, Context Toggle ───────────────
  menuBar.append(
    createMenuGroup("menu.view", [
      { label: "menu.view.reload", action: "reload" },
      ...(cachedConfig.development_enable
        ? [{ label: "menu.view.devtools", action: "devtools" }]
        : []),
    ]),
    createMenuGroup(t("menu.help"), [
      { label: "menu.help.pages", action: "open-help" },
      { label: "menu.help.about", action: "open-about" },
    ]),
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

function createMenuGroup(titleKey, items) {
  const li = document.createElement("li");
  li.className = "menu-item";
  li.textContent = t(titleKey);

  const submenu = document.createElement("ul");
  submenu.className = "submenu";

  for (const item of items) {
    const child = document.createElement("li");
    if (item === "separator") {
      child.className = "separator";
    } else {
      child.textContent = t(item.label);
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
    t("menu.context.label"),
    isStorage,
    (checked) => {
      EventBus.emit("logging:default", [
        `[Menu] Context toggle changed: ${checked}`,
      ]);
      EventBus.emit("context:toggle", checked);
    },
    "inline",
    [t("menu.context.option.storage"), t("menu.context.option.template")]
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
            message: t("toast.noTemplateSelected"),
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
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Menu] Failed to open storage folder:",
          err,
        ]);
      }
      break;
    }

    case "open-plugins-folder": {
      try {
        const pluginPath = await EventBus.emitWithResponse(
          "plugin:get-plugins-path",
          null
        );

        if (!pluginPath) {
          throw new Error("No plugin path returned");
        }

        const result = await window.electron.shell.openPath(pluginPath);
        if (result) {
          EventBus.emit("logging:error", [
            "[Shell] Failed to open plugins folder:",
            result,
          ]);
        } else {
          EventBus.emit("logging:default", [
            "[Shell] Opened plugins folder:",
            pluginPath,
          ]);
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Menu] Failed to open plugins folder:",
          err,
        ]);
      }
      break;
    }

    case "quit":
      window.electron.app.quit();
      break;

    case "open-settings":
      window.openSettingsModal?.();
      break;

    case "open-profile-switcher":
      window.openProfileModal?.();
      break;

    case "open-plugin-manager":
      window.openPluginModal?.();
      break;

    case "reload":
      location.reload();
      break;

    case "devtools":
      window.electron.devtools.toggle();
      break;

    case "open-workspace-settings":
      window.openWorkspaceModal?.();
      break;

    case "open-git-modal":
      window.openGitModal?.();
      break;

    case "start-internal-server":
      EventBus.emit("server:status", {
        callback: (server) => {
          if (!server.running) {
            {
              const port = cachedConfig?.internal_server_port || 8383;
              EventBus.emit("server:start", { port });
            }
            EventBus.emit("ui:toast", {
              message: t("toast.serverStarted"),
              variant: "success",
            });
          } else {
            EventBus.emit("ui:toast", {
              message: t("toast.serverAlreadyRunning"),
              variant: "success",
            });
          }
        },
      });

      break;

    case "stop-internal-server":
      EventBus.emit("server:status", {
        callback: (server) => {
          if (server.running) {
            EventBus.emit("server:stop");
            EventBus.emit("ui:toast", {
              message: t("toast.serverStopped"),
              variant: "warning",
            });
          } else {
            EventBus.emit("ui:toast", {
              message: t("toast.serverNotRunning"),
              variant: "warning",
            });
          }
        },
      });
      break;

    case "get-internal-server-status":
      EventBus.emit("server:status", {
        callback: (server) => {
          EventBus.emit("logging:default", ["[Menu] Server status:", server]);
          EventBus.emit("ui:toast", {
            message: `${t("toast.serverStatus")}: ${
              server.running ? t("toast.running") : t("toast.stopped")
            } ${t("toast.onPort")} ${server.port || "-"}`,
            variant: server.running ? "success" : "info",
          });
        },
      });
      break;

    case "open-internal-server-browser":
      EventBus.emit("server:status", {
        callback: (server) => {
          if (server.running) {
            const port = server.port || 8383;
            const url = `http://localhost:${port}/`;
            EventBus.emit("file:openExternal", { url });
          } else {
            EventBus.emit("ui:toast", {
              message: t("toast.serverNotRunning"),
              variant: "warning",
            });
          }
        },
      });
      break;

    case "open-help":
      window.openHelpModal?.();
      break;

    case "open-about":
      window.openAboutModal?.();
      break;

    default:
      EventBus.emit("logging:warning", [`[Menu] Unhandled action: ${action}`]);
  }
}
