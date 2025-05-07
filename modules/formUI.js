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
    error("[FormUI] Form container not found:", containerId);
    return;
  }

  log("[FormUI] Initialized with container:", containerId);

  let currentTemplate = null;

  async function loadTemplate(templateYaml) {
    log("[FormUI] Loading template:", templateYaml.name);
    currentTemplate = templateYaml;

    clearFormUI(); // Don't render fields yet—wait for metadata
  }

  async function loadFormData(metaData, datafile) {
    log("[FormUI] loadFormData datafile:", datafile);

    if (!metaData && currentTemplate?.markdown_dir && datafile) {
      metaData = await window.api.forms.loadForm(
        currentTemplate.markdown_dir,
        datafile,
        currentTemplate.fields || []
      );
      log("[FormUI] loaded metaData from API:", metaData);
    }

    if (!metaData) {
      warn("[FormUI] No metadata available.");
      return;
    }

    // Now we can render the form
    container.innerHTML = "";
    const { saveButton, deleteButton } = renderForm(container, currentTemplate);

    saveButton.addEventListener("click", async () => {
      await saveForm();
    });
    deleteButton.addEventListener("click", async () => {
      await deleteForm(datafileInput?.value);
    });

    // Wrap in button group
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";
    buttonGroup.appendChild(saveButton);
    buttonGroup.appendChild(deleteButton);

    // Append button group to container
    container.appendChild(buttonGroup);

    applyFieldValues(container, currentTemplate.fields, metaData);

    const datafileInput = container.querySelector("#meta-json-filename");
    if (datafileInput) {
      datafileInput.value = datafile; // stripMarkdownExtension(datafile);
    }
  }

  async function saveForm() {
    log("[FormUI] Save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[FormUI] No template or markdown_dir selected.");
      EventBus.emit(
        "status:update",
        "No template or markdown directory selected."
      );
      return;
    }

    async function deleteForm(datafile) {
      if (!currentTemplate || !currentTemplate.markdown_dir) {
        warn("[FormUI] No template or markdown_dir selected for deletion.");
        EventBus.emit("status:update", "Cannot delete: template not selected.");
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to delete "${datafile}"?`
      );
      if (!confirmed) return;

      const result = await window.api.forms.deleteForm(
        currentTemplate.markdown_dir,
        datafile
      );

      if (result) {
        EventBus.emit("status:update", `Deleted: ${datafile}`);
        EventBus.emit("meta:list:reload");
        clearFormUI();
      } else {
        error("[FormUI] Deletion failed.");
        EventBus.emit("status:update", "Failed to delete metadata file.");
      }
    }

    const formData = getFormData(container, currentTemplate);
    const datafileInput = container.querySelector("#meta-json-filename");
    const datafile = validateFilenameInput(datafileInput);

    if (!datafile) {
      warn("[FormUI] No datafile provided.");
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
      error("[FormUI] Save failed:", saveResult.error);
      EventBus.emit(
        "status:update",
        `Failed to save metadata: ${saveResult.error}`
      );
    }
  }

  function connectNewButton(buttonId, getTemplateCallback) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
      warn(`[FormUI] Button not found: ${buttonId}`);
      return;
    }

    log("[FormUI] Connecting new button:", buttonId);

    btn.addEventListener("click", async () => {
      const selected = await getTemplateCallback();
      if (!selected) {
        warn("[FormUI] No template selected after button click.");
        EventBus.emit("status:update", "Please select a template first.");
        return;
      }
      await loadTemplate(selected);

      EventBus.emit(
        "status:update",
        "Ready to create a new markdown document."
      );
    });
  }

  function clearFormUI() {
    container.innerHTML = `
      <p>Select or create a data-file to begin.</p>
    `;
    log("[FormUI] Form UI cleared.");
  }

  // React to EventBus-driven form:selected
  EventBus.on("form:selected", async (datafile) => {
    if (!datafile) {
      clearFormUI();
      return;
    }

    if (!currentTemplate) {
      warn("[FormUI] No current template to load form.");
      return;
    }

    await loadFormData(null, datafile);
  });

  return {
    loadTemplate,
    loadFormData,
    saveForm,
    connectNewButton,
  };
}
