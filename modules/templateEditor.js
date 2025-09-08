// modules/templateEditor.js

import { EventBus } from "./eventBus.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import {
  renderFieldList,
  showFieldEditorModal,
  createEmptyField,
} from "./templateFieldEdit.js";
import { generateTemplateCode } from "../utils/templateGenerator.js";
import { formatError } from "../utils/templateValidation.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { createToggleButtons } from "../utils/buttonUtils.js";
import {
  createFormLegend,
  createFormRowInput,
  createFormRowDropdown,
  createSwitch,
  buildCompositeElement,
} from "../utils/elementBuilders.js";
import {
  getEditor,
  handleEditorKey,
  initCodeMirror,
} from "./templateCodemirror.js";
import {
  createTemplateAddFieldButton,
  createTemplateSaveButton,
  createTemplateSaveIconButton,
  createTemplateDeleteButton,
  createTemplateDeleteIconButton,
  createTemplateGeneratorButton,
} from "./uiButtons.js";

window.showConfirmModal = showConfirmModal;

const Sortable = window.Sortable;

let keyboardListenerAttached = false;
let collectionSwitch = null;
let editorWrapper = null;
let typeDropdown = null;

function sanitizeField(f) {
  const isGuid = f.type === "guid";

  const field = {
    key: isGuid ? "id" : f.key?.trim(),
    label: isGuid ? "GUID" : f.label?.trim(),
    type: f.type || "text",
    ...(isGuid ? { primary_key: true } : {}),
  };

  if (f.description?.trim()) field.description = f.description.trim();
  if (f.summary_field?.trim()) field.summary_field = f.summary_field.trim();
  if (f.expression_item) field.expression_item = true;
  if (f.two_column) field.two_column = true;

  if (f.type === "textarea") {
    const fmt = String(f.format || "markdown").toLowerCase();
    field.format = fmt === "plain" ? "plain" : "markdown";
  }

  if (
    f.default !== undefined &&
    f.default !== null &&
    `${f.default}`.trim() !== ""
  ) {
    field.default = f.default;
  }

  if (f.options && Array.isArray(f.options) && f.options.length > 0) {
    field.options = f.options;
  }

  // PRESERVE code-specific settings
  if (f.type === "code") {
    const rm = String(f.run_mode || "manual").toLowerCase();
    field.run_mode = ["manual", "load", "save"].includes(rm) ? rm : "manual";
    field.allow_run = !!f.allow_run;

    const im = String(f.input_mode || "safe").toLowerCase();
    field.input_mode = im === "raw" ? "raw" : "safe";

    const am = String(f.api_mode || "frozen").toLowerCase();
    field.api_mode = am === "raw" ? "raw" : "frozen";

    field.api_pick = Array.isArray(f.api_pick)
      ? f.api_pick
          .filter((k) => typeof k === "string" && k.trim())
          .map((k) => k.trim())
      : [];
  }

  return field;
}

export function initTemplateEditor(containerId, onSaveCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    EventBus.emit("logging:warning", [
      "[YamlEditor] YAML editor container not found:",
      containerId,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    "[YamlEditor] Initialized editor in container:",
    containerId,
  ]);
  let currentData = null;
  let editModal,
    currentEditIndex = null;

  async function renderEditor(data) {
    if (!data) {
      EventBus.emit("logging:warning", [
        "[YamlEditor] renderEditor() called with null data",
      ]);
      return;
    }

    data = await ensureVirtualLocation(data);

    currentData = structuredClone(data);
    EventBus.emit("logging:default", [
      "[YamlEditor] Rendering editor for:",
      currentData.name || "Unnamed",
    ]);

    container.innerHTML = "";

    // ─── Setup Info Fieldset ─────
    const setupFieldset = document.createElement("fieldset");
    setupFieldset.appendChild(
      createFormLegend("modal.template.legend.setup", true)
    );

    // Name field
    const nameRow = createFormRowInput({
      id: "yaml-name",
      labelOrKey: "modal.template.label.name",
      value: currentData.name || "",
      i18nEnabled: true,
    });
    setupFieldset.appendChild(nameRow);

    // Item field (dropdown)
    const { row } = createFormRowDropdown({
      id: "yaml-item-field",
      labelOrKey: "modal.template.label.itemfield",
      selectedValue: currentData.item_field || "",
      options: await getItemFieldsOptions(),
      onChange: (val) => {
        currentData.item_field = val;
      },
      i18nEnabled: true,
    });
    setupFieldset.appendChild(row);

    // Markdown template editor
    const templateRow = document.createElement("div");
    templateRow.className = "modal-form-row full-editor-row";

    const label = buildCompositeElement({
      forId: "markdown-template",
      labelOrKey: "special.html.span.small",
      args: ["modal.template.label.code", "modal.template.label.code.expand"],
      i18nEnabled: true,
    });

    const editorWrapperDiv = document.createElement("div");
    editorWrapperDiv.className = "editor-wrapper";

    const textarea = document.createElement("textarea");
    textarea.id = "markdown-template";
    textarea.rows = 7;
    textarea.value = currentData.markdown_template || "";
    editorWrapperDiv.appendChild(textarea);

    const generateWrapper = document.createElement("div");
    generateWrapper.className = "button-row";
    generateWrapper.id = "template-generate-wrapper";

    templateRow.appendChild(label);
    templateRow.appendChild(editorWrapperDiv);
    templateRow.appendChild(generateWrapper);

    setupFieldset.appendChild(templateRow);

    // Expression Handling input row
    const sidebarRow = createFormRowInput({
      id: "sidebar-expression",
      labelOrKey: "modal.template.label.sidebar",
      value: currentData.sidebar_expression || "",
      multiline: true,
      i18nEnabled: true,
    });
    setupFieldset.appendChild(sidebarRow);

    // ─── Enable Collection Switch ──────
    collectionSwitch = createSwitch(
      "template-enable-collection",
      "modal.template.enable.collection",
      currentData.enable_collection === true,
      () => {
        const hasGuid = currentData.fields.some((f) => f.type === "guid");
        const checkbox = document.getElementById("template-enable-collection");

        if (!hasGuid) {
          checkbox.checked = false;
          EventBus.emit("ui:toast", {
            languageKey: "toast.template.enable.collection",
            variant: "warn",
          });
        }
      },
      "block",
      ["standard.enabled", "standard.disabled"],
      true
    );
    setupFieldset.appendChild(collectionSwitch);

    // ─── Fields Fieldset ────────────────
    const fieldsFieldset = document.createElement("fieldset");
    fieldsFieldset.appendChild(
      createFormLegend("modal.template.legend.fields", true)
    );

    const fieldList = document.createElement("ul");
    fieldList.id = "fields-list";
    fieldList.className = "field-list";

    const addFieldRow = document.createElement("div");
    addFieldRow.id = "field-add-row";
    addFieldRow.className = "field-add-row";

    fieldsFieldset.appendChild(fieldList);
    fieldsFieldset.appendChild(addFieldRow);

    // ─── Action Buttons ────────────────
    const actionsRow = document.createElement("div");
    actionsRow.className = "button-group";
    actionsRow.id = "template-actions-row";

    // ─── Inject ─────────────────────────
    container.appendChild(setupFieldset);
    container.appendChild(fieldsFieldset);
    container.appendChild(actionsRow);

    // ─── Init CodeMirror ────────────────
    initCodeMirror(textarea, currentData.markdown_template || "");
    editorWrapper = editorWrapperDiv;

    // ─── Generate Button ────────────────
    const generateBtn = createTemplateGeneratorButton(() => {
      const code = generateTemplateCode(currentData.fields);
      getEditor().setValue(code);
      generateWrapper.style.display = "none";
    });
    generateWrapper.appendChild(generateBtn);

    // ─── Add Field Button ───────────────
    addFieldRow.appendChild(
      createTemplateAddFieldButton(() => {
        currentEditIndex = null;
        openEditModal(createEmptyField());
      })
    );

    // ─── Save + Delete Buttons ──────────
    const { save, delete: del } = await createToggleButtons(
      {
        save: async () => {
          const fieldsSanitized = currentData.fields.map((f) =>
            sanitizeField(f)
          );
          const collectionElement = document.getElementById(
            "template-enable-collection"
          );
          const hasGuidField = fieldsSanitized.some((f) => f.type === "guid");

          const fullTemplate = {
            name:
              container.querySelector("#yaml-name")?.value.trim() || "Unnamed",
            item_field:
              container.querySelector("#yaml-item-field")?.value.trim() || "",
            markdown_template: getEditor()?.getValue() || "",
            sidebar_expression:
              container.querySelector("#sidebar-expression")?.value.trim() ||
              "",
            enable_collection: hasGuidField
              ? collectionElement?.checked === true
              : false,
            fields: fieldsSanitized,
          };

          const errors = await new Promise((resolve) => {
            EventBus.emit("template:validate", {
              data: fullTemplate,
              callback: resolve,
            });
          });

          if (errors?.length > 0) {
            EventBus.emit("status:update", {
              message: "status.template.validation.error",
              languageKey: "status.template.validation.error",
              i18nEnabled: true,
              args: [errors.length],
            });
            errors.forEach((err) => {
              const { key, args } = formatError(err);
              EventBus.emit("ui:toast", {
                message: key,
                languageKey: key,
                variant: "error",
                i18nEnabled: true,
                args: args || [],
              });
            });
            return;
          }

          EventBus.emit("editor:save", {
            container,
            fields: fullTemplate.fields,
            callback: onSaveCallback,
          });

          const filename = window.currentSelectedTemplateName || "Unknown";

          EventBus.emit("status:update", {
            message: "status.template.save.success",
            languageKey: "status.template.save.success",
            i18nEnabled: true,
            args: [filename],
          });
          EventBus.emit("ui:toast", {
            languageKey: "toast.template.save.success",
            args: [filename],
            variant: "success",
          });
        },
        delete: () => {
          EventBus.emit("editor:delete", container);
        },
      },
      {
        icon: {
          save: createTemplateSaveIconButton,
          delete: createTemplateDeleteIconButton,
        },
        label: {
          save: createTemplateSaveButton,
          delete: createTemplateDeleteButton,
        },
      }
    );

    actionsRow.appendChild(save);
    actionsRow.appendChild(del);

    // ─── Editor Change → Show/Hide Generate Button ─────
    const editor = getEditor();
    const updateVisibility = () => {
      const hasCode = editor.getValue().trim().length > 0;
      generateWrapper.style.display = hasCode ? "none" : "block";
    };
    editor.on("change", updateVisibility);
    updateVisibility();

    // ─── Render Field List ──────────────
    renderFieldListWrapper();

    // ─── Keyboard Shortcuts ─────────────
    if (keyboardListenerAttached) {
      document.removeEventListener("keydown", handleEditorKey);
    }
    document.addEventListener("keydown", handleEditorKey);
    keyboardListenerAttached = true;
  }

  function updateCollectionSwitch() {
    const hasGuidField = currentData.fields.some((f) => f.type === "guid");

    const switchEl = document.getElementById("template-enable-collection");
    if (!switchEl) return;

    if (!hasGuidField) {
      switchEl.classList.add("disabled-switch");
      switchEl.checked = false;
    } else {
      switchEl.classList.remove("disabled-switch");
      // let user control .checked
    }
  }

  function renderFieldListWrapper() {
    const list = container.querySelector("#fields-list");
    renderFieldList(list, currentData.fields, {
      onEditIndex: (idx) => {
        currentEditIndex = idx;
      },
      onOpenEditModal: openEditModal,
    });

    updateCollectionSwitch();
  }

  function openEditModal(field) {
    showFieldEditorModal(field, currentData.fields, (confirmed) => {
      const newFields = Array.isArray(confirmed) ? confirmed : [confirmed];
      if (currentEditIndex != null) {
        currentData.fields.splice(currentEditIndex, 1, ...newFields);
      } else {
        currentData.fields.push(...newFields);
      }
      renderFieldListWrapper();
    });
  }

  return { render: renderEditor };
}

async function getItemFieldsOptions() {
  const templateName = window.currentSelectedTemplateName;
  const rawOptions = await EventBus.emitWithResponse(
    "template:itemFields",
    templateName
  );

  // Normalize into [{ value, label }]
  const options = (rawOptions || []).map((opt) => {
    if (typeof opt === "string") return { value: opt, label: opt };
    if (opt && typeof opt === "object") {
      return {
        value: opt.key || opt.value || "",
        label: opt.label || opt.key || opt.value || "",
      };
    }
    return { value: String(opt), label: String(opt) };
  });

  return options;
}
