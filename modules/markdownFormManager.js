// markdownFormManager.js

import { updateStatus } from "./statusManager.js";
import { log, warn, error } from "./logger.js"; // <-- ADD THIS

export function initMarkdownFormManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    error("[MarkdownFormManager] Markdown form container not found:", containerId);
    return;
  }

  log("[MarkdownFormManager] Initialized with container:", containerId);

  let currentTemplate = null;
  let reloadMarkdownList = null;
  let currentData = {}; // <-- reserved for possible future state

  function clearForm() {
    log("[MarkdownFormManager] Clearing form...");
    container.innerHTML = "";
  }

  function renderForm(template) {
    log("[MarkdownFormManager] Rendering form for template:", template.name || "Unnamed Template");
    clearForm();

    template.fields.forEach((field) => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "form-row";

      const label = document.createElement("label");
      label.textContent = field.label;
      fieldDiv.appendChild(label);

      let input;
      if (field.type === "boolean") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = field.default === true;
      } else if (field.type === "dropdown") {
        input = document.createElement("select");
        (field.options || []).forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = field.default || "";
      }

      input.name = field.key;
      fieldDiv.appendChild(input);
      container.appendChild(fieldDiv);
    });

    const filenameDiv = document.createElement("div");
    filenameDiv.className = "form-row";

    const filenameLabel = document.createElement("label");
    filenameLabel.textContent = "Filename (without extension)";
    filenameDiv.appendChild(filenameLabel);

    const filenameInput = document.createElement("input");
    filenameInput.type = "text";
    filenameInput.id = "markdown-filename"; // important ID
    filenameDiv.appendChild(filenameInput);

    container.appendChild(filenameDiv);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Markdown";
    saveBtn.className = "btn btn-default btn-info";
    saveBtn.addEventListener("click", handleSave);
    container.appendChild(saveBtn);

    log("[MarkdownFormManager] Form rendered.");
  }

  function getFormData() {
    const data = {};
    container.querySelectorAll("input, select").forEach((el) => {
      if (el.name) {
        if (el.type === "checkbox") {
          data[el.name] = el.checked;
        } else {
          data[el.name] = el.value;
        }
      }
    });
    log("[MarkdownFormManager] Collected form data:", data);
    return data;
  }

  async function handleSave() {
    log("[MarkdownFormManager] Handle save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[MarkdownFormManager] No current template or markdown_dir selected.");
      updateStatus("No template or markdown directory selected.");
      return;
    }

    const markdownData = getFormData();
    const filenameInput = container.querySelector("#markdown-filename");
    let filename = filenameInput?.value.trim();

    if (!filename) {
      warn("[MarkdownFormManager] Save aborted: No filename provided.");
      updateStatus("Please enter a filename before saving.");
      return;
    }

    log("[MarkdownFormManager] Saving markdown file:", filename + ".md");

    const saveResult = await window.api.saveMarkdown(
      currentTemplate.markdown_dir,
      filename + ".md",
      markdownData
    );

    if (saveResult.success) {
      log("[MarkdownFormManager] Successfully saved:", saveResult.path);
      updateStatus(`Saved markdown: ${saveResult.path}`);

      if (typeof reloadMarkdownList === "function") {
        log("[MarkdownFormManager] Reloading markdown list...");
        reloadMarkdownList();
      }
    } else {
      error("[MarkdownFormManager] Failed to save markdown:", saveResult.error);
      updateStatus(`Failed to save: ${saveResult.error}`);
    }
  }

  async function loadTemplate(templateYaml) {
    log("[MarkdownFormManager] Loading template:", templateYaml.name || "Unnamed Template");
    currentTemplate = templateYaml;
    currentData = {};
    renderForm(templateYaml);
  }

  function connectNewButton(buttonId, getTemplateCallback) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
      warn(`[MarkdownFormManager] Button not found: ${buttonId}`);
      return;
    }

    log("[MarkdownFormManager] Connecting button:", buttonId);

    btn.addEventListener("click", async () => {
      log("[MarkdownFormManager] New document button clicked.");
      const selected = await getTemplateCallback();
      if (!selected) {
        warn("[MarkdownFormManager] No template selected after new button click.");
        updateStatus("Please select a template first.");
        return;
      }
      await loadTemplate(selected);
      focusTitleField();
      updateStatus("Ready to create a new markdown document.");
    });
  }

  function focusTitleField() {
    log("[MarkdownFormManager] Focusing title field...");
    const titleInput = container.querySelector('input[name="title"]');
    if (titleInput) {
      titleInput.focus();
      log("[MarkdownFormManager] Focused title input.");
    } else {
      const firstInput = container.querySelector("input, select, textarea");
      if (firstInput) {
        firstInput.focus();
        log("[MarkdownFormManager] Focused first available input.");
      } else {
        warn("[MarkdownFormManager] No input field found to focus.");
      }
    }
  }

  function setReloadMarkdownList(fn) {
    reloadMarkdownList = fn;
    log("[MarkdownFormManager] Reload markdown list function set.");
  }

  return {
    loadTemplate,
    getFormData,
    handleSave,
    clearForm,
    connectNewButton,
    setReloadMarkdownList,
  };
}
