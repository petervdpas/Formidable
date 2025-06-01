// modules/settingsManager.js

import { EventBus } from "./eventBus.js";
import { initTabs } from "../utils/tabUtils.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import { initThemeToggle } from "./themeToggle.js";
import { createSwitch } from "../utils/elementBuilders.js";
import { createDropdown } from "./dropdownManager.js";

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
  const isStorage = cachedConfig?.context_mode === "storage";

  container.innerHTML = "";

  // ─── Tabs ─────────────────────────────
  const tabButtons = document.createElement("div");
  tabButtons.className = "tab-buttons";
  tabButtons.innerHTML = `
  <button class="tab-btn">General</button>
  <button class="tab-btn">Directories</button>
  <button class="tab-btn">Workspace</button>`;

  const tabGeneral = document.createElement("div");
  tabGeneral.className = "tab-panel tab-general";

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

  const tabDirs = document.createElement("div");
  tabDirs.className = "tab-panel tab-dirs";
  tabDirs.innerHTML = `
  ${createDirectoryPicker(
    "settings-template-dir",
    "Template Directory",
    config.templates_location || "./templates"
  )}
  ${createDirectoryPicker(
    "settings-storage-dir",
    "Storage Directory",
    config.storage_location || "./storage"
  )}`;

  const tabWorkspace = document.createElement("div");
  tabWorkspace.className = "tab-panel tab-workspace";

  // Context toggle first
  const contextSwitch = createSwitch(
    "context-toggle",
    "Context Mode",
    isStorage,
    null,
    "block",
    ["Storage", "Template"]
  );
  tabWorkspace.appendChild(contextSwitch);

  // Wrapper block for future dynamic content
  const contextWrapper = document.createElement("div");
  contextWrapper.id = "context-selection-wrapper";
  contextWrapper.className = "context-wrapper";
  contextWrapper.style.marginTop = "12px";

  contextWrapper.innerHTML = `
  <div style="font-size: 0.9em; color: var(--input-fg); opacity: 0.8;">
    This section will show available forms or templates depending on context mode.
  </div>
`;

  tabWorkspace.appendChild(contextWrapper);

  // ─── Inject into container ────────────
  container.appendChild(tabButtons);
  container.appendChild(tabGeneral);
  container.appendChild(tabDirs);
  container.appendChild(tabWorkspace);

  initTabs("#settings-body", ".tab-btn", ".tab-panel", {
    activeClass: "active",
    onTabChange: (index) => {
      EventBus.emit("logging:default", [`[Settings] Switched to tab ${index}`]);
    },
  });

  setupBindings(cachedConfig);
  renderContextDropdown(isStorage, {
    ...cachedConfig,
    selected_template: window.currentSelectedTemplateName,
  });
  return true;
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

      renderContextDropdown(isStorage, {
        ...cachedConfig,
        selected_template: window.currentSelectedTemplateName,
      });
    });
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
    "settings-template-dir",
    "templates_location",
    "template:list:reload"
  );
  bindDirButton("settings-storage-dir", "storage_location", "form:list:reload");
}

function renderContextDropdown(isStorage, config) {
  const wrapper = document.getElementById("context-selection-wrapper");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div style="font-size: 0.9em; color: var(--input-fg); opacity: 0.8;">
      This section will show available forms or templates depending on context mode.
    </div>
  `;

  const dropdown = createDropdown({
    containerId: "context-selection-wrapper",
    labelText: isStorage ? "Available Forms" : "Available Templates",
    selectedValue: isStorage
      ? window.currentSelectedFormName
      : window.currentSelectedTemplateName,
    options: [],
    onRefresh: async () => {
      try {
        if (isStorage) {
          const template = window.currentSelectedTemplate;
          if (!template || !template.storage_location) return [];

          const files = await window.api.forms.listForms(
            template.storage_location
          );
          return files.map((f) => ({
            value: f,
            label: f.replace(/\.meta\.json$/, ""),
          }));
        } else {
          const templates = await window.api.templates.listTemplates();
          return templates.map((t) => ({
            value: t,
            label: t.replace(/\.yaml$/, ""),
          }));
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Settings] Failed to reload dropdown:",
          err,
        ]);
        return [];
      }
    },
    onChange: async (val) => {
      if (!val) return;

      if (isStorage) {
        EventBus.emit("form:list:itemClicked", val);
        EventBus.emit("form:list:highlighted", val); // just the name
      } else {
        EventBus.emit("template:list:itemClicked", val);
        //EventBus.emit("template:list:highlighted", val); // just the name
      }
    },
  });

  dropdown?.refresh();
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
