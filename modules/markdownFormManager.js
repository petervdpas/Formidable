// markdownFormManager.js

import { updateStatus } from "./statusManager.js";

export function initMarkdownFormManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Markdown form container not found:", containerId);
    return;
  }

  let currentTemplate = null;
  let currentData = {};

  function clearForm() {
    container.innerHTML = "";
  }

  function renderForm(template) {
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
    return data;
  }

  async function handleSave() {
    if (!currentTemplate || !currentTemplate.markdown_dir) {
      updateStatus("No template or markdown directory selected.");
      return;
    }
  
    const markdownData = getFormData();
  
    const filenameInput = container.querySelector("#markdown-filename");
    let filename = filenameInput?.value.trim();
  
    if (!filename) {
      updateStatus("Please enter a filename before saving.");
      return;
    }
  
    const saveResult = await window.api.saveMarkdown(
      currentTemplate.markdown_dir,
      filename + ".md",
      markdownData
    );
  
    if (saveResult.success) {
      console.log("Saved to:", saveResult.path);
      updateStatus(`Saved markdown: ${saveResult.path}`);
    } else {
      console.error("Failed:", saveResult.error);
      updateStatus(`Failed to save: ${saveResult.error}`);
    }
  }

  async function loadTemplate(templateYaml) {
    currentTemplate = templateYaml;
    currentData = {};
    renderForm(templateYaml);
  }

  function connectNewButton(buttonId, getTemplateCallback) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
      console.warn(`Button not found: ${buttonId}`);
      return;
    }

    btn.addEventListener("click", async () => {
      const selected = await getTemplateCallback();
      if (!selected) {
        updateStatus("Please select a template first.");
        return;
      }
      await loadTemplate(selected); // ⬅️ await this!
      focusTitleField();
      updateStatus("Ready to create a new markdown document.");
    });
  }

  function focusTitleField() {
    const titleInput = container.querySelector('input[name="title"]');
    if (titleInput) {
      titleInput.focus();
    } else {
      const firstInput = container.querySelector("input, select, textarea");
      if (firstInput) {
        firstInput.focus();
      }
    }
  }

  return {
    loadTemplate,
    getFormData,
    handleSave,
    clearForm,
    connectNewButton,
  };
}
