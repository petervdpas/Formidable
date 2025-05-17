// modules/contextManager.js

import { EventBus } from "./eventBus.js";
import { setupSplitter } from "../utils/resizing.js";
import { log, warn, error } from "../utils/logger.js";

let templateSplitterInitialized = false;
let formSplitterInitialized = false;

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

  if (mode === "form" && !formSplitterInitialized) {
    setupSplitter({
      splitter: document.getElementById("markdown-splitter"),
      left: document.getElementById("markdown-sidebar"),
      right: document.getElementById("markdown-workspace"),
      container: document.getElementById("markdown-container"),
      min: 150,
    });
    formSplitterInitialized = true;
  }
}

export function setContextView(mode, containers) {
  const isForm = mode === "form";
  containers.templateContainer.style.display = isForm ? "none" : "flex";
  containers.markdownContainer.style.display = isForm ? "flex" : "none";
  initSplitters(mode);
  log("[Context] Switched to:", mode);
}

export function initContextToggle({ toggleElement }) {
  toggleElement.addEventListener("change", (e) => {
    const isForm = e.target.checked;
    EventBus.emit("context:toggle", isForm);
  });
}
