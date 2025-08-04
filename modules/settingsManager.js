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
import { createDropdown } from "../utils/dropdownUtils.js";
import { t, getAvailableLanguages } from "../utils/i18n.js";

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
  const tabGeneralLabel = t("modal.settings.tab.general");
  const tabDisplayLabel = t("modal.settings.tab.display");
  const tabDirectoriesLabel = t("modal.settings.tab.directories");
  const tabInternalLabel = t("modal.settings.tab.internal");
  const tabAdvancedLabel = t("modal.settings.tab.advanced");

  const tabButtons = document.createElement("div");
  tabButtons.className = "tab-buttons";
  tabButtons.innerHTML = `
    <button class="tab-btn">${tabGeneralLabel}</button>
    <button class="tab-btn">${tabDisplayLabel}</button>
    <button class="tab-btn">${tabDirectoriesLabel}</button>
    <button class="tab-btn">${tabInternalLabel}</button>
    <button class="tab-btn">${tabAdvancedLabel}</button>
  `;

  // ─── General Settings ─────────────────
  const tabGeneral = document.createElement("div");
  tabGeneral.className = "tab-panel tab-general";

  const languageRow = document.createElement("div");
  languageRow.id = "settings-language";
  languageRow.className = "modal-form-row";

  addContainerElement({
    parent: tabGeneral,
    tag: "p",
    className: "form-info-text",
    textContent: t("modal.settings.tab.general.description"),
  });

  tabGeneral.appendChild(languageRow);

  tabGeneral.appendChild(
    bindFormInput("author-name", "author_name", t("modal.settings.author.name"))
  );

  tabGeneral.appendChild(
    bindFormInput(
      "author-email",
      "author_email",
      t("modal.settings.author.email")
    )
  );

  // ─── Display Settings ─────────────────
  const tabDisplay = document.createElement("div");
  tabDisplay.className = "tab-panel tab-display";

  addContainerElement({
    parent: tabDisplay,
    tag: "p",
    className: "form-info-text",
    textContent: t("modal.settings.tab.display.description"),
  });

  tabDisplay.appendChild(
    createSwitch(
      "theme-toggle",
      t("modal.settings.display.theme"),
      config.theme === "dark",
      null,
      "block",
      [
        t("modal.settings.display.theme.dark"),
        t("modal.settings.display.theme.light"),
      ]
    )
  );

  tabDisplay.appendChild(
    createSwitch(
      "show-expressions-toggle",
      t("standard.expressions"),
      config.use_expressions ?? true,
      null,
      "block",
      [t("standard.show"), t("standard.hide")]
    )
  );

  tabDisplay.appendChild(
    createSwitch(
      "show-icons-toggle",
      t("modal.settings.icon.buttons"),
      config.show_icon_buttons ?? true,
      null,
      "block",
      [t("standard.on.experimental"), t("standard.off")]
    )
  );

  // ─── Directories & Git ───────────────
  const tabDirs = document.createElement("div");
  tabDirs.className = "tab-panel tab-dirs";

  addContainerElement({
    parent: tabDirs,
    tag: "p",
    className: "form-info-text",
    textContent: t("modal.settings.tab.directories.description"),
  });

  const contextFolderPicker = createDirectoryPicker({
    id: "settings-context-folder",
    label: t("modal.settings.context.folder"),
    value: config.context_folder || "./",
    outerClass: "modal-form-row tight-gap",
  });
  tabDirs.appendChild(contextFolderPicker.element);

  const useGitSwitch = createSwitch(
    "settings-use-git",
    t("modal.settings.git.enabled"),
    config.use_git ?? false,
    null,
    "block",
    [t("standard.enabled"), t("standard.disabled")]
  );
  tabDirs.appendChild(useGitSwitch);

  const gitRootPicker = createDirectoryPicker({
    id: "settings-git-root",
    label: t("modal.settings.git.root"),
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
    textContent: t("modal.settings.tab.internal.description"),
  });

  tabServer.appendChild(
    createSwitch(
      "internal-server-toggle",
      t("modal.settings.internal.enabled"),
      config.enable_internal_server ?? false,
      null,
      "block",
      [t("standard.on"), t("standard.off")]
    )
  );

  tabServer.appendChild(
    bindFormInput(
      "internal-server-port",
      "internal_server_port",
      t("modal.settings.internal.port")
    )
  );

  // ─── Advanced Settings ──────────────────────
  const tabAdvanced = document.createElement("div");
  tabAdvanced.className = "tab-panel tab-advanced";

  addContainerElement({
    parent: tabAdvanced,
    tag: "p",
    className: "form-info-text",
    textContent: t("modal.settings.tab.advanced.description"),
  });

  tabAdvanced.appendChild(
    createSwitch(
      "plugin-toggle",
      t("modal.settings.advanced.plugins.enabled"),
      config.enable_plugins ?? false,
      null,
      "block",
      [t("standard.enabled"), t("standard.disabled")]
    )
  );

  tabAdvanced.appendChild(
    createFormRowInput({
      id: "encryption-key",
      label: t("modal.settings.advanced.secretKey"),
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
      t("modal.settings.advanced.developmentMode"),
      config.development_enable ?? false,
      null,
      "block",
      [t("standard.enabled"), t("standard.disabled")]
    )
  );

  tabAdvanced.appendChild(
    createSwitch(
      "logging-toggle",
      t("modal.settings.advanced.logging.enabled"),
      config.logging_enabled,
      null,
      "block",
      [t("standard.enabled"), t("standard.disabled")]
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

  setupLanguageDropdown(config);
  setupBindings(config, gitRootPicker);
  return true;
}

function setupBindings(config, gitRootPicker) {
  bindThemeSwitch("theme-toggle", "theme");
  bindToggleSwitch("show-icons-toggle", "show_icon_buttons");
  bindToggleSwitch("show-expressions-toggle", "use_expressions");

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

function setupLanguageDropdown(config) {

  createDropdown({
    containerId: "settings-language",
    labelText: t("modal.settings.author.language", "Language"),
    selectedValue: config.language || "en",
    options: getAvailableLanguages(),
    onChange: async (value) => {
      // Persist
      await EventBus.emit("config:update", { language: value });
      cachedConfig = await reloadConfig();

      // Load & apply translations immediately
      try {
        await loadLocale(value);
        translateDOM();
        EventBus.emit("status:update", `Language set to ${value}`);
        EventBus.emit("i18n:changed", value); // optional hook for other modules
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Settings] Failed to switch language",
          err,
        ]);
        EventBus.emit("status:update", `Failed to switch language to ${value}`);
      }
    },
  });
}
