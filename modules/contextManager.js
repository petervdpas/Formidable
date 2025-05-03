// modules/contextManager.js

import { setupSplitter } from "./splitter.js";
import { log } from "./logger.js";
import { updateStatus } from "./statusManager.js";

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
  toggleElement.addEventListener("change", async (e) => {
    const mode = e.target.checked ? "markdown" : "template";
    await window.api.config.updateUserConfig({ context_mode: mode });

    setContextView(mode, containers);

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

    updateStatus(`Context set to ${mode === "markdown" ? "Markdown" : "Template"}`);
  });
}

export async function toggleContextMode(enabled) {
  const mode = enabled ? "markdown" : "template";
  await window.api.config.updateUserConfig({ context_mode: mode });

  setContextView(mode, {
    templateContainer: document.getElementById("template-container"),
    markdownContainer: document.getElementById("markdown-container"),
  });

  updateStatus(`Context set to ${mode === "markdown" ? "Markdown" : "Template"}`);
}
