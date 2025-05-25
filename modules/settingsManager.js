// modules/settingsManager.js

import { EventBus } from "./eventBus.js";
import { initTabs } from "../utils/tabUtils.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import { initThemeToggle } from "./themeToggle.js";

export async function renderSettings() {
  const container = document.getElementById("settings-body");
  if (!container) return false;

  const config = await window.api.config.loadUserConfig();

  container.innerHTML = `
    <div class="tab-buttons">
      <button class="tab-btn">General</button>
      <button class="tab-btn">Directories</button>
    </div>
    <div class="tab-panel tab-general">
      ${createSwitch("theme-toggle", "Dark Mode", config.theme === "dark")}
      ${createSwitch(
        "context-toggle",
        "Context Mode",
        config.context_mode === "template"
      )}
      ${createSwitch(
        "logging-toggle",
        "Enable Logging",
        config.logging_enabled
      )}
    </div>
    <div class="tab-panel tab-dirs">
      ${createDirectoryPicker(
        "template-dir",
        "Template Directory",
        config.templates_location || "./templates"
      )}
      ${createDirectoryPicker(
        "storage-dir",
        "Storage Directory",
        config.storage_location || "./storage"
      )}
    </div>
  `;

  initTabs("#settings-body", ".tab-btn", ".tab-panel", {
    activeClass: "active",
    onTabChange: (index) => {
      EventBus.emit("logging:default", [`[Settings] Switched to tab ${index}`]);
    },
  });

  setupBindings(config);
  return true;
}

function createSwitch(id, label, checked) {
  return `
    <div class="modal-form-row switch-row">
      <label for="${id}">${label}</label>
      <label class="switch">
        <input type="checkbox" id="${id}" ${checked ? "checked" : ""} />
        <span class="slider"></span>
      </label>
    </div>
  `;
}

function createDirectoryPicker(id, label, value) {
  return `
    <div class="modal-form-row directory-picker">
      <label for="${id}">${label}</label>
      <div style="display: flex; gap: 6px; flex: 1">
        <input type="text" id="${id}" value="${value}" readonly />
        <button id="choose-${id}" class="btn btn-default">Browse</button>
      </div>
    </div>
  `;
}

function setupBindings(config) {
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const loggingToggle = document.getElementById("logging-toggle");

  if (themeToggle) {
    initThemeToggle(themeToggle);
    EventBus.emit("theme:toggle", themeToggle.checked ? "dark" : "light");
  }

  if (contextToggle) {
    contextToggle.checked = config.context_mode === "storage";
    contextToggle.addEventListener("change", () => {
      const isStorage = contextToggle.checked;
      EventBus.emit("logging:default", [
        `[Settings] Context toggle changed: ${isStorage}`,
      ]);
      EventBus.emit("context:toggle", isStorage);
    });
  }

  if (loggingToggle) {
    loggingToggle.onchange = async () => {
      const enabled = loggingToggle.checked;
      await window.api.config.updateUserConfig({ logging_enabled: enabled });
      EventBus.emit("logging:toggle", enabled);
      EventBus.emit(
        "status:update",
        `Logging ${enabled ? "enabled" : "disabled"}`
      );
    };
  }

  bindDirButton("template-dir", "templates_location", "template:list:reload");
  bindDirButton("storage-dir", "storage_location", "form:list:reload");
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

    EventBus.emit("status:update", `Updated ${configKey}: ${relative}`);
    if (reloadEvent) EventBus.emit(reloadEvent);
  };
}
