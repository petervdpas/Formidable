// modules/formInputManager.js

import { updateStatus } from "./statusManager.js";
import { log, warn, error } from "./logger.js";
import { saveMeta, loadMeta } from "./metaManager.js";
import { saveMarkdown, loadMarkdown } from "./markdownManager.js";

export function initMarkdownFormManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    error("[MarkdownFormManager] Container not found:", containerId);
    return;
  }

  log("[MarkdownFormManager] Initialized with container:", containerId);

  let currentTemplate = null;
  let reloadMarkdownList = null;
  let fieldElements = {};
  let fields = [];

  function clearForm() {
    log("[MarkdownFormManager] Clearing form...");
    container.innerHTML = "";
  }

  function renderForm(template) {
    log("[MarkdownFormManager] Rendering form for:", template.name || "Unnamed Template");
    clearForm();

    fields = template.fields;
    fieldElements = {};

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
      fieldElements[field.key] = input;

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
    filenameInput.id = "markdown-filename";
    filenameDiv.appendChild(filenameInput);

    container.appendChild(filenameDiv);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Metadata";
    saveBtn.className = "btn btn-default btn-info";
    saveBtn.addEventListener("click", handleSave);

    container.appendChild(saveBtn);

    log("[MarkdownFormManager] Form rendered.");
  }

  function getFormData() {
    const data = {};
    container.querySelectorAll("input, select").forEach((el) => {
      if (el.name) {
        data[el.name] = el.type === "checkbox" ? el.checked : el.value;
      }
    });
    log("[MarkdownFormManager] Collected form data:", data);
    return data;
  }

  async function handleSave() {
    log("[MarkdownFormManager] Save triggered.");

    if (!currentTemplate || !currentTemplate.markdown_dir) {
      warn("[MarkdownFormManager] No template or markdown_dir selected.");
      updateStatus("No template or markdown directory selected.");
      return;
    }

    const formData = getFormData();
    const filenameInput = container.querySelector("#markdown-filename");
    const filename = filenameInput?.value.trim();

    if (!filename) {
      warn("[MarkdownFormManager] Save aborted: No filename provided.");
      updateStatus("Please enter a filename.");
      return;
    }

    const markdownDir = currentTemplate.markdown_dir;

    const metaResult = await saveMeta(markdownDir, filename + ".md", formData);

    if (metaResult.success) {
      updateStatus(`Saved metadata: ${metaResult.path}`);
      if (reloadMarkdownList) reloadMarkdownList();
    } else {
      error("[MarkdownFormManager] Failed to save metadata:", metaResult.error);
      updateStatus(`Failed to save metadata: ${metaResult.error}`);
    }
  }

  async function loadTemplate(templateYaml) {
    log("[MarkdownFormManager] Loading template:", templateYaml.name);
    currentTemplate = templateYaml;
    renderForm(templateYaml);
  }

  async function loadFormData(metaData, filename) {
    if (!metaData) {
      warn("[MarkdownFormManager] No metadata provided for loading.");
      return;
    }
    log("[MarkdownFormManager] Loading metadata for:", filename);
    populateFormFields(metaData, filename);
  }

  async function loadMarkdownData(markdownString, filename) {
    const parsedData = parseMarkdownToFields(markdownString);
    if (!parsedData) {
      warn("[MarkdownFormManager] Failed to parse markdown fallback.");
      return;
    }
    log("[MarkdownFormManager] Parsed markdown as fallback for:", filename);

    populateFormFields(parsedData, filename);

    // Auto-create meta.json if missing
    if (currentTemplate && currentTemplate.markdown_dir) {
      log("[MarkdownFormManager] Saving auto-generated metadata from parsed markdown...");
      await saveMeta(currentTemplate.markdown_dir, filename, parsedData);
    }
  }

  function populateFormFields(data, filename) {
    fields.forEach((field) => {
      const el = fieldElements[field.key];
      if (!el) return;
      if (field.type === "boolean") {
        el.checked = data[field.key] === true;
      } else {
        el.value = data[field.key] ?? "";
      }
    });

    const filenameInput = container.querySelector("#markdown-filename");
    if (filenameInput) {
      filenameInput.value = filename.replace(/\.md$/, "");
      log("[MarkdownFormManager] Set filename field:", filename);
    }
  }

  function connectNewButton(buttonId, getTemplateCallback) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
      warn(`[MarkdownFormManager] Button not found: ${buttonId}`);
      return;
    }

    log("[MarkdownFormManager] Connecting new button:", buttonId);

    btn.addEventListener("click", async () => {
      const selected = await getTemplateCallback();
      if (!selected) {
        warn("[MarkdownFormManager] No template selected after click.");
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
      log("[MarkdownFormManager] Focused input field.");
    } else {
      warn("[MarkdownFormManager] No input field to focus.");
    }
  }

  function setReloadMarkdownList(fn) {
    reloadMarkdownList = fn;
    log("[MarkdownFormManager] Reload markdown list function set.");
  }

  function parseMarkdownToFields(markdown) {
    const lines = markdown.split("\n");
    const result = {};

    for (const line of lines) {
      const checkbox = line.match(/- \[(x| )\] (.+)/i);
      if (checkbox) {
        const [, checked, key] = checkbox;
        result[key.trim()] = checked.toLowerCase() === "x";
        continue;
      }

      const textField = line.match(/\*\*(.+):\*\* (.+)/);
      if (textField) {
        const [, key, value] = textField;
        result[key.trim()] = value.trim();
      }
    }

    return result;
  }

  return {
    loadTemplate,
    loadFormData,
    loadMarkdownData,
    getFormData,
    handleSave,
    clearForm,
    connectNewButton,
    setReloadMarkdownList,
  };
}