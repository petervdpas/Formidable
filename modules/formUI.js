// modules/formUI.js

import { fieldTypes } from "./fieldTypes.js";
import { EventBus } from "./eventBus.js";
import { log, warn, error } from "./logger.js";

function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormInputManager] Missing container or template.");
    return {};
  }

  log(
    "[FormInputManager] Rendering form for:",
    template.name || "Unnamed Template"
  );

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  fields.forEach((field) => {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "form-row";

    const label = document.createElement("label");
    label.textContent = field.label;
    fieldDiv.appendChild(label);

    const typeDef = fieldTypes[field.type];
    if (!typeDef) {
      warn(`[FormInputManager] Unknown field type: ${field.type}`);
      return;
    }

    const input = typeDef.renderInput(field);
    if (!input) {
      warn(`[FormInputManager] No input rendered for type: ${field.type}`);
      return;
    }

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

  return fieldElements;
}

function getFormData(container, template) {
  const data = {};
  const fields = template.fields || [];

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef || typeof typeDef.parseValue !== "function") {
      warn(`[FormOutputManager] No parser for field type: ${field.type}`);
      return;
    }

    const el = container.querySelector(`[name="${field.key}"]`);
    if (!el) {
      warn(`[FormOutputManager] Missing input for: ${field.key}`);
      return;
    }

    data[field.key] = typeDef.parseValue(el);
  });

  log("[FormOutputManager] Collected form data:", data);
  return data;
}

function populateFormFields(container, template, data) {
  if (!data) {
    warn("[FormOutputManager] No data to populate form fields.");
    return;
  }

  const fields = template.fields || [];

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef || typeof typeDef.renderInput !== "function") {
      warn(`[FormOutputManager] No renderer for field type: ${field.type}`);
      return;
    }

    const input = container.querySelector(`[name="${field.key}"]`);
    if (!input) {
      warn(`[FormOutputManager] Missing input for: ${field.key}`);
      return;
    }

    const value = data[field.key];

    // Smart assignment
    if (input.type === "checkbox") {
      input.checked = value === true;
    } else if (input.type === "radio") {
      const group = container.querySelectorAll(
        `input[type="radio"][name="${field.key}"]`
      );
      group.forEach((el) => {
        el.checked = el.value === value;
      });
    } else if (
      input.tagName === "TEXTAREA" ||
      input.tagName === "INPUT" ||
      input.tagName === "SELECT"
    ) {
      input.value = value ?? "";
    } else {
      warn(`[FormOutputManager] Unhandled input type for: ${field.key}`);
    }
  });

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
      focusFirstInput();
      EventBus.emit("status:update", "Ready to create a new markdown document.");
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
