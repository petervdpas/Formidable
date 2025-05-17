// modules/contextManager.js

import { EventBus } from "./eventBus.js";
import { setupSplitter } from "../utils/resizing.js";
import { log, warn, error } from "../utils/logger.js";

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
  log("[Context] Switched to:", mode);
}

export function initContextToggle({ toggleElement }) {
  toggleElement.addEventListener("change", (e) => {
    const isStorage = e.target.checked;
    EventBus.emit("context:toggle", isStorage);
  });
}
