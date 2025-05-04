// modules/contextManager.js

import { EventBus } from "./eventBus.js";
import { setupSplitter } from "./uiBehaviors.js";
import { log } from "./logger.js";

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

export function initContextToggle({ toggleElement }) {
  toggleElement.addEventListener("change", (e) => {
    const isMarkdown = e.target.checked;
    EventBus.emit("context:toggle", isMarkdown);
  });
}
