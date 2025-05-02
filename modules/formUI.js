// modules/formUI.js

import { updateStatus } from "./statusManager.js"; 
import { log, warn, error } from "./logger.js"; 

function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormInputManager] Missing container or template.");
    return {};
  }

  log("[FormInputManager] Rendering form for:", template.name || "Unnamed Template");

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  fields.forEach((field) => {
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

  // Special: Add filename input
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

  return fieldElements;
}

function getFormData(container) {
  const data = {};
  container.querySelectorAll("input, select").forEach((el) => {
    if (el.name) {
      data[el.name] = el.type === "checkbox" ? el.checked : el.value;
    }
  });
  log("[FormOutputManager] Collected form data:", data);
  return data;
}

function populateFormFields(fieldElements, data) {
  if (!data) {
    warn("[FormOutputManager] No data to populate form fields.");
    return;
  }

  for (const key in fieldElements) {
    const el = fieldElements[key];
    if (!el) continue;

    if (el.type === "checkbox") {
      el.checked = data[key] === true;
    } else {
      el.value = data[key] ?? "";
    }
  }

  log("[FormOutputManager] Populated form fields from data.");
}

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

    // 💾 Add Save Button
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Input";
    saveBtn.className = "btn btn-default btn-info";
    saveBtn.addEventListener("click", async () => {
      await saveForm();
    });
    container.appendChild(saveBtn);
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
    const saveResult = await window.api.saveForm(
      markdownDir,
      filename + ".md",
      formData
    ); // 🛠 FIXED: use window.api

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
    const firstInput = container.querySelector(
      'input[name="title"], input, select, textarea'
    );
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
