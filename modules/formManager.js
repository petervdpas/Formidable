// modules/formManager.js

import { renderForm } from "./formInputManager.js";
import { getFormData, populateFormFields } from "./formOutputManager.js";
import { updateStatus } from "./statusManager.js"; // ✅ keep
import { log, warn, error } from "./logger.js";      // ✅ keep

export function initFormManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    error("[FormManager] Form container not found:", containerId);
    return;
  }

  log("[FormManager] Initialized with container:", containerId);

  let currentTemplate = null;
  let fieldElements = {};
  let reloadMarkdownList = null;

  async function loadTemplate(templateYaml) {
    log("[FormManager] Loading template:", templateYaml.name);
    currentTemplate = templateYaml;
    fieldElements = renderForm(container, templateYaml);
  }

  async function loadFormData(metaData, filename) {
    if (!metaData) {
      warn("[FormManager] No metadata provided for loading.");
      return;
    }
    log("[FormManager] Loading metadata for:", filename);
    populateFormFields(fieldElements, metaData);

    const filenameInput = container.querySelector("#markdown-filename");
    if (filenameInput) {
      filenameInput.value = filename.replace(/\.md$/, "");
    }
  }

  async function saveForm() {
    log("[FormManager] Save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[FormManager] No template or markdown_dir selected.");
      updateStatus("No template or markdown directory selected.");
      return;
    }

    const formData = getFormData(container);
    const filenameInput = container.querySelector("#markdown-filename");
    const filename = filenameInput?.value.trim();

    if (!filename) {
      warn("[FormManager] No filename provided.");
      updateStatus("Please enter a filename.");
      return;
    }

    const markdownDir = currentTemplate.markdown_dir;
    const saveResult = await window.api.saveMeta(markdownDir, filename + ".md", formData); // 🛠 FIXED: use window.api

    if (saveResult.success) {
      updateStatus(`Saved metadata: ${saveResult.path}`);
      if (reloadMarkdownList) reloadMarkdownList();
    } else {
      error("[FormManager] Save failed:", saveResult.error);
      updateStatus(`Failed to save metadata: ${saveResult.error}`);
    }
  }

  function setReloadMarkdownList(fn) {
    reloadMarkdownList = fn;
    log("[FormManager] Reload markdown list function set.");
  }

  function connectNewButton(buttonId, getTemplateCallback) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
      warn(`[FormManager] Button not found: ${buttonId}`);
      return;
    }
  
    log("[FormManager] Connecting new button:", buttonId);
  
    btn.addEventListener("click", async () => {
      const selected = await getTemplateCallback();
      if (!selected) {
        warn("[FormManager] No template selected after button click.");
        updateStatus("Please select a template first.");
        return;
      }
      await loadTemplate(selected);
      focusFirstInput();
      updateStatus("Ready to create a new markdown document.");
    });
  }
  
  function focusFirstInput() {
    const firstInput = container.querySelector('input[name="title"], input, select, textarea');
    if (firstInput) {
      firstInput.focus();
      log("[FormManager] Focused first input.");
    } else {
      warn("[FormManager] No input to focus.");
    }
  }

  return {
    loadTemplate,
    loadFormData,
    saveForm,
    setReloadMarkdownList,
    connectNewButton,
  };
}
