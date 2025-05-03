// modules/contextManager.js

import { setupSplitter } from "./splitter.js";
import { log } from "./logger.js";
import { EventBus } from "./eventBus.js";

let templateSplitterInitialized = false;
let markdownSplitterInitialized = false;

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

  if (mode === "markdown" && !markdownSplitterInitialized) {
    setupSplitter({
      splitter: document.getElementById("markdown-splitter"),
      left: document.getElementById("markdown-sidebar"),
      right: document.getElementById("markdown-workspace"),
      container: document.getElementById("markdown-container"),
      min: 150,
    });
    markdownSplitterInitialized = true;
  }
}

export function setContextView(mode, containers) {
  const isMarkdown = mode === "markdown";
  containers.templateContainer.style.display = isMarkdown ? "none" : "flex";
  containers.markdownContainer.style.display = isMarkdown ? "flex" : "none";
  initSplitters(mode);
  log("[Context] Switched to:", mode);
}

export function initContextToggle({
  toggleElement,
  containers,
  dropdown,
  metaListManager,
  currentTemplateGetter,
}) {
  // 🔄 Handle context changes
  EventBus.on("context:toggle", async (isMarkdown) => {
    const mode = isMarkdown ? "markdown" : "template";

    if (toggleElement) toggleElement.checked = isMarkdown;

    setContextView(mode, containers);
    await window.api.config.updateUserConfig({ context_mode: mode });

    if (mode === "markdown") {
      await dropdown.refresh?.();

      const currentName = window.currentSelectedTemplateName;
      if (currentName && dropdown?.setSelected) {
        dropdown.setSelected(currentName);
      }

      if (currentTemplateGetter()) {
        await metaListManager.loadList();
      }
    }

    EventBus.emit(
      "status:update",
      `Context set to ${isMarkdown ? "Markdown" : "Template"}`
    );
  });

  // 🔄 Handle template selection
  EventBus.on("template:selected", async ({ name, yaml }) => {
    window.currentSelectedTemplateName = name;
    window.currentSelectedTemplate = yaml;
    await window.api.config.updateUserConfig({ selected_template: name });
  });

  // 🔄 Handle form selection
  EventBus.on("form:selected", async (filename) => {
    await window.api.config.updateUserConfig({ selected_data_file: filename });
  });

  // 🖱️ Handle manual toggle
  toggleElement.addEventListener("change", (e) => {
    const isMarkdown = e.target.checked;
    EventBus.emit("context:toggle", isMarkdown);
  });
}
