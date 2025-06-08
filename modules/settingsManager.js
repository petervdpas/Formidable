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

  cachedConfig = await window.api.config.loadUserConfig();
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

  // Author fields via helper
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

  // Theme + Logging switches
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
  tabDirs.innerHTML = `
    ${createDirectoryPicker({
      id: "settings-context-folder",
      label: "Context Folder",
      value: config.context_folder || "./",
    })}
  `;

  // Inject tabs
  container.appendChild(tabButtons);
  container.appendChild(tabGeneral);
  container.appendChild(tabDirs);

  initTabs("#settings-body", ".tab-btn", ".tab-panel", {
    activeClass: "active",
    onTabChange: (index) => {
      EventBus.emit("logging:default", [`[Settings] Switched to tab ${index}`]);
    },
  });

  setupBindings(config);
  return true;
}

function setupBindings(config) {
  const themeToggle = document.getElementById("theme-toggle");
  const loggingToggle = document.getElementById("logging-toggle");

  if (themeToggle) {
    initThemeToggle(themeToggle);
    EventBus.emit("theme:toggle", themeToggle.checked ? "dark" : "light");
  }

  if (loggingToggle) {
    loggingToggle.onchange = async () => {
      const enabled = loggingToggle.checked;
      await window.api.config.updateUserConfig({ logging_enabled: enabled });
      cachedConfig = await window.api.config.loadUserConfig();
      EventBus.emit("logging:toggle", enabled);
      EventBus.emit(
        "status:update",
        `Logging ${enabled ? "enabled" : "disabled"}`
      );
    };
  }

  bindDirButton(
    "settings-context-folder",
    "context_folder",
    "context:folder:changed"
  );
}

function bindDirButton(fieldId, configKey, reloadEvent) {
  const input = document.getElementById(fieldId);
  const button = document.getElementById(`choose-${fieldId}`);
  if (!input || !button) return;

  button.onclick = async () => {
    const selected = await window.api.dialog.chooseDirectory();
    if (!selected) return;

    const appRoot = (await window.api.system.getAppRoot?.()) || ".";
    const relative = formatAsRelativePath(selected, appRoot);

    input.value = relative;
    await window.api.config.updateUserConfig({ [configKey]: relative });

    cachedConfig = await window.api.config.loadUserConfig();

    EventBus.emit("status:update", `Updated ${configKey}: ${relative}`);
    if (reloadEvent) EventBus.emit(reloadEvent);
  };
}
