// yaml_editor.js

import { log, warn } from "./logger.js"; // <-- ADD centralized logger

export function initYamlEditor(containerId, onSaveCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    warn("[YamlEditor] YAML editor container not found:", containerId);
    return;
  }

  log("[YamlEditor] Initialized editor in container:", containerId);

  let currentData = null;

  function renderEditor(data) {
    currentData = structuredClone(data);
    log("[YamlEditor] Rendering editor for:", currentData.name || "Unnamed Setup");

    container.innerHTML = `
      <fieldset>
        <legend>Setup Info</legend>
        <div class="form-row">
          <label for="yaml-name">Name</label>
          <input type="text" id="yaml-name" value="${currentData.name || ""}" />
        </div>
        <div class="form-row">
          <label for="markdown-dir">Markdown Dir</label>
          <input type="text" id="markdown-dir" value="${
            currentData.markdown_dir || ""
          }" />
        </div>
      </fieldset>
  
      <fieldset>
        <legend>Fields</legend>
        <div id="fields-list">
          ${currentData.fields
            .map((f, idx) => renderFieldBlock(f, idx))
            .join("")}
        </div>
        <div class="form-row">
          <button id="add-field" class="btn btn-info">+ Add Field</button>
        </div>
      </fieldset>
  
      <div class="button-group">
        <button id="save-yaml" class="btn btn-default">Save</button>
      </div>
    `;

    wireEvents();
  }

  function renderFieldBlock(field, index) {
    return `
      <div class="field-block" data-idx="${index}">
        <div class="form-row two-column">
          <div>
            <label>Key</label>
            <input type="text" class="field-key" value="${field.key}" />
          </div>
          <div>
            <label>Type</label>
            <select class="field-type">
              <option value="text" ${field.type === "text" ? "selected" : ""}>Text</option>
              <option value="boolean" ${field.type === "boolean" ? "selected" : ""}>Boolean</option>
              <option value="dropdown" ${field.type === "dropdown" ? "selected" : ""}>Dropdown</option>
            </select>
          </div>
        </div>
  
        <div class="form-row two-column">
          <div>
            <label>Label</label>
            <input type="text" class="field-label" value="${field.label}" />
          </div>
          <div>
            <label>Default</label>
            <input type="text" class="field-default" value="${field.default || ""}" />
          </div>
        </div>
  
        <div class="form-row field-options-row" style="${
          field.type === "dropdown" ? "" : "display: none;"
        }">
          <label>Options</label>
          <input type="text" class="field-options" placeholder="Comma-separated" value="${(
            field.options || []
          ).join(", ")}" />
        </div>
  
        <div class="form-row">
          <button class="btn btn-warn remove-field">✕ Remove</button>
        </div>
        <hr />
      </div>
    `;
  }

  function wireEvents() {
    log("[YamlEditor] Wiring form events...");

    container.querySelectorAll(".field-type").forEach((el) => {
      el.addEventListener("change", (e) => {
        const block = e.target.closest(".field-block");
        const optionsRow = block.querySelector(".field-options-row");
        optionsRow.style.display = e.target.value === "dropdown" ? "" : "none";
      });
    });

    container.querySelectorAll(".remove-field").forEach((el) =>
      el.addEventListener("click", (e) => {
        const idx = e.target.closest(".field-block").dataset.idx;
        log("[YamlEditor] Removing field at index:", idx);
        currentData.fields.splice(idx, 1);
        renderEditor(currentData);
      })
    );

    container.querySelector("#add-field").addEventListener("click", () => {
      log("[YamlEditor] Adding new field...");
      currentData.fields.push({ key: "", type: "text", label: "" });
      renderEditor(currentData);
    });

    container.querySelector("#save-yaml").addEventListener("click", () => {
      log("[YamlEditor] Saving YAML...");

      const name = container.querySelector("#yaml-name").value.trim();
      const dir = container.querySelector("#markdown-dir").value.trim();
      const fields = [];

      container
        .querySelectorAll("#fields-list .field-block")
        .forEach((block) => {
          const key = block.querySelector(".field-key").value.trim();
          const type = block.querySelector(".field-type").value;
          const label = block.querySelector(".field-label").value.trim();
          const defaultVal = block.querySelector(".field-default").value.trim();
          const options = block
            .querySelector(".field-options")
            ?.value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const field = { key, type, label };
          if (type === "dropdown") field.options = options;
          if (defaultVal) field.default = defaultVal;

          if (key && type && label) fields.push(field);
        });

      const updated = { name, markdown_dir: dir, fields };
      log("[YamlEditor] Calling save callback with updated data:", updated);
      onSaveCallback?.(updated);
    });
  }

  return { render: renderEditor };
}
