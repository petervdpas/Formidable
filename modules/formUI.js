// modules/formUI.js

import { log, warn, error } from "../utils/logger.js";
import { EventBus } from "./eventBus.js";
import { getFormData } from "../utils/formUtils.js";
import { applyFieldValues, focusFirstInput } from "../utils/domUtils.js";
import { renderForm } from "./formRenderer.js";
import {
  stripMarkdownExtension,
  validateFilenameInput,
} from "../utils/formUtils.js";

export function createFormManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    error("[FormManager] Form container not found:", containerId);
    return;
  }

  log("[FormManager] Initialized with container:", containerId);

  let currentTemplate = null;

  async function loadTemplate(templateYaml) {
    log("[FormManager] Loading template:", templateYaml.name);
    currentTemplate = templateYaml;

    const { saveButton } = renderForm(container, templateYaml);

    saveButton.addEventListener("click", async () => {
      await saveForm();
    });
    container.appendChild(saveButton);
  }

  async function loadFormData(metaData, datafile) {
    log("[FormManager] Loading metadata for:", datafile);

    if (!metaData && currentTemplate?.markdown_dir && datafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.markdown_dir,
        datafile,
        currentTemplate.fields || []
      );
    }

    if (!metaData) {
      warn("[FormManager] No metadata available.");
      return;
    }

    applyFieldValues(container, currentTemplate.fields, metaData);

    const datafileInput = container.querySelector("#markdown-filename");
    if (datafileInput) {
      datafileInput.value = stripMarkdownExtension(datafile);
    }
  }

  async function saveForm() {
    log("[FormManager] Save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[FormManager] No template or markdown_dir selected.");
      EventBus.emit(
        "status:update",
        "No template or markdown directory selected."
      );
      return;
    }

    const formData = getFormData(container, currentTemplate);
    const datafileInput = container.querySelector("#markdown-filename");
    const datafile = validateFilenameInput(datafileInput);

    if (!datafile) {
      warn("[FormManager] No datafile provided.");
      EventBus.emit("status:update", "Please enter a filename for datafile.");
      return;
    }

    const markdownDir = currentTemplate.markdown_dir;
    const saveResult = await window.api.forms.saveForm(
      markdownDir,
      datafile,
      formData,
      currentTemplate.fields || []
    );

    if (saveResult.success) {
      EventBus.emit("status:update", `Saved metadata: ${saveResult.path}`);
      EventBus.emit("meta:list:reload");
    } else {
      error("[FormManager] Save failed:", saveResult.error);
      EventBus.emit(
        "status:update",
        `Failed to save metadata: ${saveResult.error}`
      );
    }
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

      EventBus.emit(
        "status:update",
        "Ready to create a new markdown document."
      );
    });
  }

  function clearFormUI() {
    container.innerHTML = "";
    log("[FormManager] Form UI cleared.");
  }

  // 🔁 React to EventBus-driven form:selected
  EventBus.on("form:selected", async (datafile) => {
    if (!datafile) {
      clearFormUI();
      return;
    }

    if (!currentTemplate) {
      warn("[FormManager] No current template to load form.");
      return;
    }

    await loadFormData(null, datafile);
  });

  EventBus.on("form:clear", async () => {
    clearFormUI();
  });

  return {
    loadTemplate,
    loadFormData,
    saveForm,
    connectNewButton,
    clearFormUI,
  };
}
