// modules/handlers/contextHandlers.js

import { setContextView } from "../contextManager.js";
import { log } from "../logger.js";

export function handleContextToggle(isMarkdown) {
  log("[Handler] Context toggled:", isMarkdown);

  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");

  const toggle = document.getElementById("context-toggle");
  const menuToggle = document.getElementById("context-toggle-menu");

  if (toggle) toggle.checked = isMarkdown;
  if (menuToggle) menuToggle.checked = isMarkdown;

  setContextView(isMarkdown ? "markdown" : "template", {
    templateContainer,
    markdownContainer,
  });
}
