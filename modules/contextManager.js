// modules/contextManager.js

import { setupSplitter } from "./splitter.js";
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

// Pass containers in as arguments
export function setContextView(mode, { templateContainer, markdownContainer }) {
  const isMarkdown = mode === "markdown";
  templateContainer.style.display = isMarkdown ? "none" : "flex";
  markdownContainer.style.display = isMarkdown ? "flex" : "none";
  initSplitters(mode);
  log("[Context] Switched to:", mode);
}
