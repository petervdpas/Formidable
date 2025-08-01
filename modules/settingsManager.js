// modules/settingsManager.js

import { EventBus } from "./eventBus.js";
import { initTabs } from "../utils/tabUtils.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import { initThemeToggle } from "./themeToggle.js";
import {
  createDirectoryPicker,
  createSwitch,
  createFormRowInput,
  addContainerElement,
} from "../utils/elementBuilders.js";

let cachedConfig = null;

export function getCachedConfig() {
  return cachedConfig;
}

export function invalidateCachedConfig() {
  cachedConfig = null;
}

export async function renderSettings() {
  const container = document.getElementById("settings-body");
  if (!container) return false;

  cachedConfig = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });
  const config = cachedConfig;

  container.innerHTML = "";

  // ─── Tabs ─────────────────────────────
  const tabButtons = document.createElement("div");
  tabButtons.className = "tab-buttons";
  tabButtons.innerHTML = `
    <button class="tab-btn">General</button>
    <button class="tab-btn">Display</button>
    <button class="tab-btn">Directories</button>
    <button class="tab-btn">Internal Server</button>
    <button class="tab-btn">Advanced</button>
  `;

  // ─── General Settings ─────────────────
  const tabGeneral = document.createElement("div");
  tabGeneral.className = "tab-panel tab-general";

  addContainerElement({
    parent: tabGeneral,
    tag: "p",
    className: "form-info-text",
    textContent:
      "Configure author details and your secret key. The secret key is used to encrypt/decrypt sensitive data.",
  });

  tabGeneral.appendChild(
    bindFormInput("author-name", "author_name", "Author Name")
  );

  tabGeneral.appendChild(
    bindFormInput("author-email", "author_email", "Author Email")
  );

  // ─── Display Settings ─────────────────
  const tabDisplay = document.createElement("div");
  tabDisplay.className = "tab-panel tab-display";

  addContainerElement({
    parent: tabDisplay,
    tag: "p",
    className: "form-info-text",
    textContent: "Configure the display theme and toggle icon-based buttons.",
  });

  tabDisplay.appendChild(
    createSwitch(
      "theme-toggle",
      "Display Theme",
      config.theme === "dark",
      null,
      "block",
      ["Dark", "Light"]
    )
  );

  tabDisplay.appendChild(
    createSwitch(
      "show-expressions-toggle",
      "Expressions",
      config.use_expressions ?? true,
      null,
      "block",
      ["Show", "Hide"]
    )
  );

  tabDisplay.appendChild(
    createSwitch(
      "show-icons-toggle",
      "Icon Buttons",
      config.show_icon_buttons ?? true,
      null,
      "block",
      ["On (Experimental)", "Off"]
    )
  );

  // ─── Directories & Git ───────────────
  const tabDirs = document.createElement("div");
  tabDirs.className = "tab-panel tab-dirs";

  addContainerElement({
    parent: tabDirs,
    tag: "p",
    className: "form-info-text",
    textContent:
      "Configure the context folder and, if enabled, the Git root directory.",
  });

  const contextFolderPicker = createDirectoryPicker({
    id: "settings-context-folder",
    label: "Context Folder",
    value: config.context_folder || "./",
    outerClass: "modal-form-row tight-gap",
  });
  tabDirs.appendChild(contextFolderPicker.element);

  const useGitSwitch = createSwitch(
    "settings-use-git",
    "Use Git Repository",
    config.use_git ?? false,
    null,
    "block",
    ["Enabled", "Disabled"]
  );
  tabDirs.appendChild(useGitSwitch);

  const gitRootPicker = createDirectoryPicker({
    id: "settings-git-root",
    label: "Git Root Directory",
    value: config.git_root || "",
    outerClass: "modal-form-row tight-gap",
  });
  tabDirs.appendChild(gitRootPicker.element);

  // Disable Git picker initially if not enabled
  const isGitEnabled = config.use_git === true;
  gitRootPicker.input.disabled = !isGitEnabled;
  gitRootPicker.button.disabled = !isGitEnabled;
  gitRootPicker.element.classList.toggle("disabled", !isGitEnabled);

  // ─── Internal Server ──────────────────────
  const tabServer = document.createElement("div");
  tabServer.className = "tab-panel tab-server";

  addContainerElement({
    parent: tabServer,
    tag: "p",
    className: "form-info-text",
    textContent: "Configure the built-in server and set the listening port.",
  });

  tabServer.appendChild(
    createSwitch(
      "internal-server-toggle",
      "Internal Server",
      config.enable_internal_server ?? false,
      null,
      "block",
      ["On", "Off"]
    )
  );

  tabServer.appendChild(
    bindFormInput("internal-server-port", "internal_server_port", "Server Port")
  );

  // ─── Advanced Settings ──────────────────────
  const tabAdvanced = document.createElement("div");
  tabAdvanced.className = "tab-panel tab-advanced";

  addContainerElement({
    parent: tabAdvanced,
    tag: "p",
    className: "form-info-text",
    textContent: "Advanced system options. Use with caution.",
  });

  tabAdvanced.appendChild(
    createSwitch(
      "plugin-toggle",
      "Enable Plugins",
      config.enable_plugins ?? false,
      null,
      "block",
      ["Enabled", "Disabled"]
    )
  );

  tabAdvanced.appendChild(
    createFormRowInput({
      id: "encryption-key",
      label: "Secret Decryption Key",
      type: "password",
      value: config.encryption_key,
      configKey: "encryption_key",
      onSave: async (val) => {
        await EventBus.emit("config:update", { encryption_key: val });
        cachedConfig = await reloadConfig();
        EventBus.emit("status:update", "Secret key updated");
      },
    })
  );

  tabAdvanced.appendChild(
    createSwitch(
      "settings-development-toggle",
      "Development Mode",
      config.development_enable ?? false,
      null,
      "block",
      ["Enabled", "Disabled"]
    )
  );

  tabAdvanced.appendChild(
    createSwitch(
      "logging-toggle",
      "Enable Logging",
      config.logging_enabled,
      null,
      "block",
      ["On", "Off"]
    )
  );

  // Inject tabs and setup bindings
  container.appendChild(tabButtons);
  container.appendChild(tabGeneral);
  container.appendChild(tabDisplay);
  container.appendChild(tabDirs);
  container.appendChild(tabServer);
  container.appendChild(tabAdvanced);

  initTabs("#settings-body", ".tab-btn", ".tab-panel", {
    activeClass: "active",
    onTabChange: (index) => {
      EventBus.emit("logging:default", [`[Settings] Switched to tab ${index}`]);
    },
  });

  setupBindings(config, gitRootPicker);
  return true;
}

function setupBindings(config, gitRootPicker) {
  bindThemeSwitch("theme-toggle", "theme");
  bindToggleSwitch("show-icons-toggle", "show_icon_buttons");
  bindToggleSwitch(
    "show-expressions-toggle",
    "use_expressions"
  );

  bindToggleSwitch("plugin-toggle", "enable_plugins");
  bindToggleSwitch("settings-development-toggle", "development_enable");
  bindToggleSwitch("logging-toggle", "logging_enabled", (enabled) =>
    EventBus.emit("logging:toggle", enabled)
  );

  bindDirButton("settings-context-folder", "context_folder");
  bindToggleSwitch("settings-use-git", "use_git", (enabled) => {
    gitRootPicker.input.disabled = !enabled;
    gitRootPicker.button.disabled = !enabled;
    gitRootPicker.element.classList.toggle("disabled", !enabled);
    if (!enabled) {
      gitRootPicker.input.value = "";
      EventBus.emit("config:update", { git_root: "" });
    }
  });
  bindDirButton("settings-git-root", "git_root");

  bindToggleSwitch("internal-server-toggle", "enable_internal_server");
}

async function reloadConfig() {
  return new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });
}

function bindThemeSwitch(switchId, configKey) {
  const el = document.getElementById(switchId);
  if (!el) return;

  initThemeToggle(el); // keep your logic
  EventBus.emit("theme:toggle", el.checked ? "dark" : "light");

  el.onchange = async () => {
    const theme = el.checked ? "dark" : "light";
    await EventBus.emit("config:update", { [configKey]: theme });
    cachedConfig = await reloadConfig();
    EventBus.emit("theme:toggle", theme);
    EventBus.emit("status:update", `Theme set to ${theme}`);
  };
}

function bindToggleSwitch(switchId, configKey, onExtra = null) {
  const el = document.getElementById(switchId);
  if (!el) return;

  el.onchange = async () => {
    const enabled = el.checked;
    await EventBus.emit("config:update", { [configKey]: enabled });
    if (typeof onExtra === "function") await onExtra(enabled);
    cachedConfig = await reloadConfig();
    EventBus.emit(
      "status:update",
      `${configKey.replace(/_/g, " ")} ${enabled ? "enabled" : "disabled"}`
    );
  };
}

function bindFormInput(id, configKey, label) {
  return createFormRowInput({
    id,
    label,
    value: cachedConfig[configKey],
    configKey,
    onSave: async (val) => {
      EventBus.emit("config:update", { [configKey]: val });
      cachedConfig = await reloadConfig();
      EventBus.emit("status:update", `${label} set to ${val}`);
    },
  });
}

function bindDirButton(fieldId, configKey) {
  const input = document.getElementById(fieldId);
  const button = document.getElementById(`choose-${fieldId}`);
  if (!input || !button) return;

  button.onclick = async () => {
    const selected = await window.api.dialog.chooseDirectory();
    if (!selected) return;

    const appRoot = (await window.api.system.getAppRoot?.()) || ".";
    const relative = formatAsRelativePath(selected, appRoot);

    input.value = relative;
    await EventBus.emit("config:update", { [configKey]: relative });
    cachedConfig = await reloadConfig();

    EventBus.emit("status:update", `Updated ${configKey}: ${relative}`);
  };
}
