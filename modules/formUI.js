// modules/formUI.js

import { log, warn, error } from "./logger.js";
import { EventBus } from "./eventBus.js";
import { getFormData, focusFirstInput } from "./formData.js";
import { renderForm, populateFormFields } from "./formRenderer.js";

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
  
    const { fieldElements: elements, saveButton } = renderForm(container, templateYaml);
    fieldElements = elements;
  
    saveButton.addEventListener("click", async () => {
      await saveForm();
    });
    container.appendChild(saveButton);
  }

  async function loadFormData(metaData, filename) {
    log("[FormManager] Loading metadata for:", filename);

    if (!metaData && currentTemplate?.markdown_dir && filename) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.markdown_dir,
        filename,
        currentTemplate.fields || []
      );
    }

    if (!metaData) {
      warn("[FormManager] No metadata available.");
      return;
    }

    populateFormFields(container, currentTemplate, metaData);

    const filenameInput = container.querySelector("#markdown-filename");
    if (filenameInput) {
      filenameInput.value = filename.replace(/\.md$/, "");
    }
  }

  async function saveForm() {
    log("[FormManager] Save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[FormManager] No template or markdown_dir selected.");
      EventBus.emit("status:update", "No template or markdown directory selected.");
      return;
    }

    const formData = getFormData(container, currentTemplate);
    const filenameInput = container.querySelector("#markdown-filename");
    const filename = filenameInput?.value.trim();

    if (!filename) {
      warn("[FormManager] No filename provided.");
      EventBus.emit("status:update", "Please enter a filename.");
      return;
    }

    const markdownDir = currentTemplate.markdown_dir;
    const saveResult = await window.api.forms.saveForm(
      markdownDir,
      filename + ".md",
      formData,
      currentTemplate.fields || []
    );

    if (saveResult.success) {
      EventBus.emit("status:update", `Saved metadata: ${saveResult.path}`);
      if (reloadMarkdownList) reloadMarkdownList();
    } else {
      error("[FormManager] Save failed:", saveResult.error);
      EventBus.emit("status:update", `Failed to save metadata: ${saveResult.error}`);
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
        EventBus.emit("status:update", "Please select a template first.");
        return;
      }
      await loadTemplate(selected);
      focusFirstInput(container);

      EventBus.emit("status:update", "Ready to create a new markdown document.");
    });
  }

  return {
    loadTemplate,
    loadFormData,
    saveForm,
    setReloadMarkdownList,
    connectNewButton,
  };
}
