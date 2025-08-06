// modules/contextManager.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { setupSplitter } from "../utils/resizing.js";
import { createSwitch } from "../utils/elementBuilders.js";
import { createDropdown } from "../utils/dropdownUtils.js";

let templateSplitterInitialized = false;
let storageSplitterInitialized = false;

function initSplitters(mode) {
  if (mode === "template" && !templateSplitterInitialized) {
    setupSplitter({
      splitter: document.getElementById("template-splitter"),
      left: document.getElementById("template-sidebar"),
      right: document.getElementById("template-workspace"),
      container: document.getElementById("template-container"),
      min: 150,
    });
    templateSplitterInitialized = true;
  }

  if (mode === "storage" && !storageSplitterInitialized) {
    setupSplitter({
      splitter: document.getElementById("storage-splitter"),
      left: document.getElementById("storage-sidebar"),
      right: document.getElementById("storage-workspace"),
      container: document.getElementById("storage-container"),
      min: 150,
    });
    storageSplitterInitialized = true;
  }
}

export function setContextView(mode, containers) {
  const isStorage = mode === "storage";
  containers.templateContainer.style.display = isStorage ? "none" : "flex";
  containers.storageContainer.style.display = isStorage ? "flex" : "none";
  initSplitters(mode);
  EventBus.emit("logging:default", ["[Context] Switched to:", mode]);
}

export function initContextToggle({ toggleElement }) {
  toggleElement.addEventListener("change", (e) => {
    const isStorage = e.target.checked;
    EventBus.emit("context:toggle", isStorage);
  });
}

let cachedConfig = null;

export async function renderWorkspaceModal() {
  const container = document.getElementById("workspace-body");
  if (!container) return false;

  cachedConfig = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });
  const config = cachedConfig;
  const isStorage = config.context_mode === "storage";

  container.innerHTML = "";

  // Context toggle
  const contextSwitch = createSwitch(
    "context-toggle",
    "menu.context.label",
    isStorage,
    (checked) => {
      const contextMode = checked ? "storage" : "template";
      EventBus.emit("logging:default", [
        `[Workspace] Context toggle changed: ${contextMode}`,
      ]);
      EventBus.emit("context:toggle", checked);

      renderContextDropdown(checked, {
        ...cachedConfig,
        selected_template: window.currentSelectedTemplateName,
      });
    },
    "block",
    ["menu.context.option.storage", "menu.context.option.template"],
    true
  );
  container.appendChild(contextSwitch);

  // Dropdown wrapper
  const contextWrapper = document.createElement("div");
  contextWrapper.id = "context-selection-wrapper";
  contextWrapper.className = "context-wrapper";
  contextWrapper.style.marginTop = "12px";
  contextWrapper.innerHTML = `
    <div style="font-size: 0.9em; color: var(--input-fg); opacity: 0.8;">
      This section will show available forms or templates depending on context mode.
    </div>
  `;
  container.appendChild(contextWrapper);

  // Initial dropdown render
  renderContextDropdown(isStorage, {
    ...cachedConfig,
    selected_template: window.currentSelectedTemplateName,
  });
}

function renderContextDropdown(isStorage, config) {
  const wrapper = document.getElementById("context-selection-wrapper");
  if (!wrapper) return;

  wrapper.innerHTML = "";

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
          const template = await ensureVirtualLocation(
            window.currentSelectedTemplate
          );
          if (!template?.virtualLocation) return [];
          const files = await new Promise((resolve) => {
            EventBus.emit("form:list", {
              templateFilename: template.filename,
              callback: resolve,
            });
          });
          return files.map((f) => ({
            value: f,
            label: f.replace(/\.meta\.json$/, ""),
          }));
        } else {
          const templates = await new Promise((resolve) => {
            EventBus.emit("template:list", { callback: resolve });
          });

          return await Promise.all(
            templates.map(async (t) => {
              const descriptor = await new Promise((resolve) => {
                EventBus.emit("template:descriptor", {
                  name: t,
                  callback: resolve,
                });
              });

              return {
                value: t,
                label:
                  descriptor?.yaml?.name?.trim() || t.replace(/\.yaml$/, ""),
              };
            })
          );
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          "[Workspace] Failed to reload dropdown:",
          err,
        ]);
        return [];
      }
    },
    onChange: async (val) => {
      if (!val) return;

      if (isStorage) {
        EventBus.emit("form:list:highlighted", val);
      } else {
        EventBus.emit("template:list:highlighted", val);
      }
    },
  });

  dropdown?.refresh();
}
