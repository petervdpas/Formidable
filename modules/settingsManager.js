// modules/settingsManager.js

import { EventBus } from "./eventBus.js";
import { initTabs } from "../utils/tabUtils.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import { initThemeToggle } from "./themeToggle.js";
import {
  createDirectoryPicker,
  createSwitch,
  createSettingsInput,
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
    <button class="tab-btn">Directories</button>
  `;

  const tabGeneral = document.createElement("div");
  tabGeneral.className = "tab-panel tab-general";

  tabGeneral.appendChild(
    createSettingsInput({
      id: "author-name",
      label: "Author Name",
      value: config.author_name,
      placeholder: "Your full name",
      configKey: "author_name",
    })
  );

  tabGeneral.appendChild(
    createSettingsInput({
      id: "author-email",
      label: "Author Email",
      value: config.author_email,
      placeholder: "you@example.com",
      type: "email",
      configKey: "author_email",
    })
  );

  tabGeneral.appendChild(
    createSwitch(
      "theme-toggle",
      "Dark Mode",
      config.theme === "dark",
      null,
      "block",
      ["On", "Off"]
    )
  );

  tabGeneral.appendChild(
    createSwitch(
      "show-icons-toggle",
      "Icon Buttons",
      config.show_icon_buttons ?? true,
      null,
      "block",
      ["On (Experimental)", "Off"]
    )
  );

  tabGeneral.appendChild(
    createSwitch(
      "logging-toggle",
      "Enable Logging",
      config.logging_enabled,
      null,
      "block",
      ["On", "Off"]
    )
  );

  // ─── Directories ──────────────────────
  const tabDirs = document.createElement("div");
  tabDirs.className = "tab-panel tab-dirs";

  const contextFolderPicker = createDirectoryPicker({
    id: "settings-context-folder",
    label: "Context Folder",
    value: config.context_folder || "./",
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
  });
  tabDirs.appendChild(gitRootPicker.element);

  // Disable Git picker initially if not enabled
  const isGitEnabled = config.use_git === true;
  gitRootPicker.input.disabled = !isGitEnabled;
  gitRootPicker.button.disabled = !isGitEnabled;
  gitRootPicker.element.classList.toggle("disabled", !isGitEnabled);

  // Inject tabs and setup bindings
  container.appendChild(tabButtons);
  container.appendChild(tabGeneral);
  container.appendChild(tabDirs);

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
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    initThemeToggle(themeToggle);
    EventBus.emit("theme:toggle", themeToggle.checked ? "dark" : "light");
  }

  const showIconsToggle = document.getElementById("show-icons-toggle");
  if (showIconsToggle) {
    showIconsToggle.onchange = async () => {
      const enabled = showIconsToggle.checked;
      EventBus.emit("config:update", { show_icon_buttons: enabled });
      cachedConfig = await reloadConfig();
      EventBus.emit(
        "status:update",
        `Icon buttons ${enabled ? "enabled" : "disabled"}`
      );
    };
  }

  const loggingToggle = document.getElementById("logging-toggle");
  if (loggingToggle) {
    loggingToggle.onchange = async () => {
      const enabled = loggingToggle.checked;
      EventBus.emit("config:update", { logging_enabled: enabled });
      cachedConfig = await reloadConfig();
      EventBus.emit("logging:toggle", enabled);
      EventBus.emit(
        "status:update",
        `Logging ${enabled ? "enabled" : "disabled"}`
      );
    };
  }

  const useGitToggle = document.getElementById("settings-use-git");
  if (useGitToggle) {
    useGitToggle.onchange = async () => {
      const enabled = useGitToggle.checked;
      await EventBus.emit("config:update", { use_git: enabled });
      if (!enabled) {
        gitRootPicker.input.value = "";
        await EventBus.emit("config:update", { git_root: "" });
      }

      gitRootPicker.input.disabled = !enabled;
      gitRootPicker.button.disabled = !enabled;
      gitRootPicker.element.classList.toggle("disabled", !enabled);

      cachedConfig = await reloadConfig();
      EventBus.emit(
        "status:update",
        `Git usage ${enabled ? "enabled" : "disabled"}`
      );
    };
  }

  bindDirButton("settings-context-folder", "context_folder");
  bindDirButton("settings-git-root", "git_root");
}

async function reloadConfig() {
  return new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
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
