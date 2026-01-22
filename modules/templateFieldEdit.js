// modules/templateFieldEdit.js

import { setupFieldEditModal } from "./modalSetup.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { applyModalTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { validateField } from "../utils/templateValidation.js";
import { applyFieldAttributeDisabling } from "../utils/formUtils.js";
import { buildButtonGroup, createToggleButtons } from "../utils/buttonUtils.js";
import { buildCompositeElementStacked } from "../utils/elementBuilders.js";
import {
  createFieldEditButton,
  createFieldEditIconButton,
  createFieldDeleteButton,
  createFieldDeleteIconButton,
  // createReorderUpButton,
  // createReorderDownButton,
} from "./uiButtons.js";
import {
  getSupportedOptionTypes,
  setupOptionsEditor,
} from "../utils/optionsEditor.js";
import { setupApiMapEditor } from "../utils/apiMapEditor.js";
import {
  createInlineCodeMirror,
  destroyInlineCodeMirror,
} from "./templateCodemirror.js";
import { t } from "../utils/i18n.js";

function setupFieldEditor(container, onChange, allFields = []) {
  const dom = {
    key: container.querySelector("#edit-key"),
    primaryKey: container.querySelector("#edit-primary-key"),
    label: container.querySelector("#edit-label"),
    description: container.querySelector("#edit-description"),
    summaryField: container.querySelector(
      "#edit-summary-field-container select"
    ),
    expressionItem: container.querySelector("#edit-expression-item"),
    expressionItemRow: container
      .querySelector("#edit-expression-item")
      ?.closest(".switch-row"),
    twoColumn: container.querySelector("#edit-two-column"),
    twoColumnRow: container
      .querySelector("#edit-two-column")
      ?.closest(".switch-row"),
    readonly: container.querySelector("#edit-readonly"),
    readonlyRow: container
      .querySelector("#edit-readonly")
      ?.closest(".switch-row"),
    default: container.querySelector("#edit-default"),
    options: container.querySelector("#edit-options"),
    type: container.querySelector("#edit-type-container select"),
    formatTextarea: container.querySelector("#edit-format"),
    formatTextareaRow: container.querySelector("#edit-format-row"),

    runmode: container.querySelector("#edit-runmode"),
    allowRun: container.querySelector("#edit-allowrun"),
    hideField: container.querySelector("#edit-hidefield"),
    inputMode: container.querySelector("#edit-inputmode"),
    apiMode: container.querySelector("#edit-apimode"),
    apiPick: container.querySelector("#edit-apipick"),

    latexUseFenced: container.querySelector("#edit-latex-usefenced"),
    latexRows: container.querySelector("#edit-latex-rows"),

    apiCollection: container.querySelector("#edit-collection"),
    apiId: container.querySelector("#edit-api-id"),
    apiMap: container.querySelector("#edit-api-map"),
    apiUsePicker: container.querySelector("#edit-api-usepicker"),
    apiAllowedIds: container.querySelector("#edit-api-allowed"),
    apiRows: container.querySelectorAll(".api-only"),
  };

  let labelLocked = false;
  let optionsEditor = null;
  let apiMapEditor = null;
  let originalKey = "";
  let confirmBtn = null;

  function initializeOptionsEditor(fieldType, fieldOptions = null) {
    if (optionsEditor?.destroy) optionsEditor.destroy();
    dom.options.value = "";
    optionsEditor = setupOptionsEditor({
      type: fieldType,
      dom: {
        options: dom.options,
        containerRow: dom.options?.closest(".modal-form-row"),
      },
      initialOptions: fieldOptions,
    });
  }

  function initializeApiMapEditor(fieldMapArray = []) {
    if (apiMapEditor?.destroy) apiMapEditor.destroy();

    const row = dom.apiMap?.closest(".modal-form-row");
    if (!dom.apiMap || !row) return;

    apiMapEditor = setupApiMapEditor({
      dom: { textarea: dom.apiMap, containerRow: row },
      initialMap: fieldMapArray,
      onDirty: (rows) => {
        // 1) re-run validation (to enable / disable Confirm button)
        validate();

        // 2) visual duplicate marker
        const seen = new Map();
        rows.forEach((r, i) => {
          const k = String(r?.key || "")
            .trim()
            .toLowerCase();
          if (!k) return;
          if (!seen.has(k)) seen.set(k, []);
          seen.get(k).push(i);
        });
        const dupIdx = [...seen.values()].filter((a) => a.length > 1).flat();
        const rowEls = row.querySelectorAll(".api-map-row");
        rowEls.forEach((el, idx) => {
          el.classList.toggle("input-error", dupIdx.includes(idx));
        });
      },
    });
  }

  function parseApiMap(raw) {
    if (Array.isArray(raw)) return normalize(raw);

    const s = String(raw || "").trim();
    if (!s) return [];

    try {
      return normalize(JSON.parse(s));
    } catch {}

    try {
      let x = s.replace(/'/g, '"');
      x = x.replace(/([{,\s])([A-Za-z_]\w*)\s*:/g, '$1"$2":');
      x = x.replace(/,\s*([}\]])/g, "$1");
      return normalize(JSON.parse(x));
    } catch {
      return [];
    }

    function normalize(arr) {
      const out = [];
      const seen = new Set();
      for (const it of arr) {
        if (!it || typeof it !== "object") continue;
        const key = typeof it.key === "string" ? it.key.trim() : "";
        if (!key || seen.has(key)) continue;
        const path =
          typeof it.path === "string" && it.path.trim() ? it.path.trim() : key;
        const mode =
          String(it.mode || "static").toLowerCase() === "editable"
            ? "editable"
            : "static";
        out.push({ key, path, mode });
        seen.add(key);
      }
      return out;
    }
  }

  function parseAllowedIds(raw) {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr))
        return arr
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
    } catch {}
    return s
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function setField(field) {
    // hard reset any previous CodeMirror cleanly
    if (dom.__codeEditor) {
      destroyInlineCodeMirror(dom.__codeEditor);
      dom.__codeEditor = null;
    }
    // paranoid sweep
    const sweepScope = container;
    sweepScope
      ?.querySelectorAll(".CodeMirror, .cm-inline-controls")
      ?.forEach((n) => n.remove());

    originalKey = field.key?.trim() || "";

    dom.key.classList.remove("input-error");
    confirmBtn = document.getElementById("field-edit-confirm");
    if (confirmBtn) confirmBtn.disabled = false;

    const isGuid = field.type === "guid";
    dom.key.value = isGuid ? "id" : field.key || "";
    dom.key.disabled = isGuid;

    if (dom.primaryKey) dom.primaryKey.value = isGuid ? "true" : "false";
    dom.label.value = isGuid ? "GUID" : field.label || "";
    dom.description.value = field.description || "";
    if (dom.summaryField) dom.summaryField.value = field.summary_field || "";
    dom.expressionItem.checked = !!field.expression_item;
    dom.twoColumn.checked = !!field.two_column;
    dom.readonly.checked = !!field.readonly;
    if (dom.formatTextarea) dom.formatTextarea.value = field.format || "";
    dom.default.value = field.default ?? "";

    // Hide readonly for markdown textarea
    function updateReadonlyVisibility() {
      if (field.type === "textarea" && dom.readonlyRow) {
        const isMarkdown = dom.formatTextarea?.value === "markdown";
        dom.readonlyRow.style.display = isMarkdown ? "none" : "";
      }
    }
    updateReadonlyVisibility();

    // Add listener for format changes
    if (dom.formatTextarea && !dom.formatTextarea.__readonlyListenerAttached) {
      dom.formatTextarea.__readonlyListenerAttached = true;
      dom.formatTextarea.addEventListener("change", updateReadonlyVisibility);
    }

    // label auto-sync
    labelLocked = !!field.label?.trim().length && field.label !== field.key;
    if (!dom.key.__listenersAttached) {
      dom.key.__listenersAttached = true;

      dom.label.addEventListener("input", () => {
        labelLocked = dom.label.value.trim().length > 0;
      });

      dom.key.addEventListener("input", () => {
        const raw = dom.key.value.trim();
        if (!labelLocked && raw) {
          dom.label.value = raw
            .replace(/[_\-]+/g, " ")
            .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
        }
        labelLocked =
          dom.label.value.trim().length > 0 &&
          dom.label.value.toLowerCase() !== dom.key.value.toLowerCase();
        validate();
      });
    }

    // type dropdown
    if (dom.type) {
      dom.type.innerHTML = "";
      for (const [typeKey, typeDef] of Object.entries(fieldTypes)) {
        const isLoop = typeKey === "loopstart" || typeKey === "loopstop";
        if (isLoop && typeKey !== field.type) continue;
        const opt = document.createElement("option");
        opt.value = typeKey;
        opt.textContent = typeDef.label || typeKey;
        dom.type.appendChild(opt);
      }
      dom.type.value = field.type || "text";

      dom.type.onchange = () => {
        const currentType = dom.type.value;
        const isGuidType = currentType === "guid";
        dom.key.value = isGuidType ? "id" : field.key || "";
        dom.key.disabled = isGuidType;
        dom.label.value = isGuidType ? "GUID" : field.label || "";

        initializeOptionsEditor(currentType, []);
        applyFieldAttributeDisabling(dom, currentType);

        maybeSwapDefaultForCode(dom, currentType, getField());

        // seed code controls when switching to code
        if (currentType === "code") {
          dom.runmode &&
            (dom.runmode.value = (field.run_mode || "manual").toLowerCase());
          dom.allowRun && (dom.allowRun.checked = !!field.allow_run);
          dom.hideField && (dom.hideField.checked = !!field.hide_field);
          dom.inputMode &&
            (dom.inputMode.value =
              (field.input_mode || "safe").toLowerCase() === "raw"
                ? "raw"
                : "safe");
          dom.apiMode &&
            (dom.apiMode.value =
              (field.api_mode || "frozen").toLowerCase() === "raw"
                ? "raw"
                : "frozen");
          dom.apiPick &&
            (dom.apiPick.value = Array.isArray(field.api_pick)
              ? field.api_pick.join(", ")
              : "");
        }

        if (currentType === "api") {
          initializeApiMapEditor(parseApiMap(dom.apiMap?.value));
        } else if (apiMapEditor?.destroy) {
          apiMapEditor.destroy();
          apiMapEditor = null;
        }

        validate();
      };
    }

    if (dom.options) {
      dom.options.value = field.options ? JSON.stringify(field.options) : "";
    }

    applyFieldAttributeDisabling(dom, field.type);
    initializeOptionsEditor(field.type, field.options);

    // when seeding the editor
    if (field.type === "api") {
      dom.apiCollection && (dom.apiCollection.value = field.collection || "");
      dom.apiId && (dom.apiId.value = field.id || "");
      dom.apiMap &&
        (dom.apiMap.value = JSON.stringify(field.map || [], null, 0));

      initializeApiMapEditor(field.map || []);

      if (dom.apiUsePicker) {
        dom.apiUsePicker.checked = !!(
          field.use_picker ??
          field.apiUsePicker ??
          false
        );
      }
      if (dom.apiAllowedIds) {
        const allowed = field.allowed_ids ?? field.apiAllowedIds ?? [];
        dom.apiAllowedIds.value = Array.isArray(allowed)
          ? allowed.join(", ")
          : String(allowed || "");
      }
    }

    // LaTeX UI
    if (field.type === "latex") {
      if (dom.latexUseFenced) dom.latexUseFenced.checked = !!field.use_fenced;
      if (dom.latexRows) dom.latexRows.value = Number(field.rows || 10);
    }

    // Populate code-specific controls when editing an existing "code" field
    if (field.type === "code") {
      dom.runmode &&
        (dom.runmode.value = (field.run_mode || "manual").toLowerCase());
      dom.allowRun && (dom.allowRun.checked = !!field.allow_run);
      dom.hideField && (dom.hideField.checked = !!field.hide_field);
      dom.inputMode &&
        (dom.inputMode.value =
          (field.input_mode || "safe").toLowerCase() === "raw"
            ? "raw"
            : "safe");
      dom.apiMode &&
        (dom.apiMode.value =
          (field.api_mode || "frozen").toLowerCase() === "raw"
            ? "raw"
            : "frozen");
      dom.apiPick &&
        (dom.apiPick.value = Array.isArray(field.api_pick)
          ? field.api_pick.join(", ")
          : "");
    }

    // create CM if needed
    maybeSwapDefaultForCode(dom, field.type, field);

    // style the modal for type (no fullscreen hooks!)
    const modal = container.closest(".modal");
    applyModalTypeClass(modal, field.type || "text", fieldTypes, "main");

    onChange?.(structuredClone(field));
    validate();
  }

  function getField() {
    const type = dom.type?.value || "text";
    if (dom.__codeEditor) {
      dom.__codeEditor.save();
    }
    const isGuid = type === "guid";
    const summaryField = dom.summaryField?.value || "";

    const supportsOptions = getSupportedOptionTypes();

    let options = [];
    if (supportsOptions.includes(type)) {
      try {
        options =
          optionsEditor?.getValues() || JSON.parse(dom.options.value || "[]");
      } catch {
        options = [];
      }
    }

    const field = {
      key: isGuid ? "id" : dom.key.value.trim(),
      label: isGuid ? "GUID" : dom.label.value.trim(),
      description: dom.description.value.trim(),
      summary_field: summaryField,
      expression_item: dom.expressionItem.checked,
      two_column: dom.twoColumn.checked,
      readonly: dom.readonly.checked,
      default: dom.default.value,
      options,
      type,
    };

    if (type === "api") {
      field.collection = dom.apiCollection?.value?.trim() || "";
      const id = dom.apiId?.value?.trim() || "";
      if (id) field.id = id;
      field.map = apiMapEditor?.getValues
        ? apiMapEditor.getValues()
        : parseApiMap(dom.apiMap?.value);
      field.use_picker = !!dom.apiUsePicker?.checked;
      field.allowed_ids = parseAllowedIds(dom.apiAllowedIds?.value);
    }

    if (type === "textarea") {
      field.format = dom.formatTextarea?.value || "markdown"; // "markdown" or "plain"
    }
    if (type === "latex") {
      field.use_fenced = !!dom.latexUseFenced?.checked;
      field.rows = Math.max(
        2,
        Math.min(60, parseInt(dom.latexRows?.value || "10", 10))
      );
    }
    if (isGuid) {
      field.primary_key = true;
    }

    // collect code props for persistence (schema-aligned)
    if (type === "code") {
      field.run_mode = (dom.runmode?.value || "manual").toLowerCase();
      if (!["manual", "load", "save"].includes(field.run_mode)) {
        field.run_mode = "manual";
      }
      field.allow_run = !!dom.allowRun?.checked;
      field.hide_field = !!dom.hideField?.checked;

      field.input_mode =
        (dom.inputMode?.value || "safe").toLowerCase() === "raw"
          ? "raw"
          : "safe";

      field.api_mode =
        (dom.apiMode?.value || "frozen").toLowerCase() === "raw"
          ? "raw"
          : "frozen";

      // split comma/space list -> array of non-empty strings
      const pickRaw = dom.apiPick?.value || "";
      field.api_pick = pickRaw
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return field;
  }

  function validate() {
    const field = getField();
    field._originalKey = originalKey;

    const result = validateField(field, allFields);
    dom.key.classList.toggle("input-error", !result.valid);
    if (confirmBtn) confirmBtn.disabled = !result.valid;
  }

  function dispose() {
    if (dom.__codeEditor) {
      destroyInlineCodeMirror(dom.__codeEditor);
      dom.__codeEditor = null;
    }
    if (apiMapEditor?.destroy) {
      apiMapEditor.destroy();
      apiMapEditor = null;
    }
  }

  return { setField, getField, dispose };
}

async function listFields(
  listEl,
  fields,
  { onEdit, onDelete, onReorder, onUp, onDown }
) {
  if (!listEl) return;
  listEl.innerHTML = "";

  // Setup Sortable once
  if (!listEl.sortableInstance && typeof Sortable !== "undefined") {
    listEl.sortableInstance = Sortable.create(listEl, {
      animation: 150,
      handle: ".field-label",
      onEnd: (evt) => {
        onReorder?.(evt.oldIndex, evt.newIndex);
      },
    });
  }

  for (const [idx, field] of fields.entries()) {
    const item = document.createElement("li");
    item.className = "field-list-item";
    item.dataset.type = field.type;

    // Label + type
    const labelEl = document.createElement("div");
    labelEl.className = "field-label";

    // Drag handle
    const dragSpan = document.createElement("span");
    dragSpan.className = "drag-handle";
    dragSpan.textContent = "☰"; // or "⠿" if preferred
    labelEl.appendChild(dragSpan);

    // Label text
    const textNode = document.createTextNode(` ${field.label} `);
    labelEl.appendChild(textNode);

    // Field type
    const typeSpan = document.createElement("span");
    typeSpan.className = `field-type type-${field.type}`;
    typeSpan.textContent = `(${field.type.toUpperCase()})`;
    labelEl.appendChild(typeSpan);

    // Actions
    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "actions-wrapper";

    const fieldButtons = await createToggleButtons(
      {
        edit: () => onEdit?.(idx),
        delete: () => onDelete?.(idx),
      },
      {
        icon: {
          edit: (cb) => createFieldEditIconButton(idx, cb),
          delete: (cb) => createFieldDeleteIconButton(idx, cb),
        },
        label: {
          edit: (cb) => createFieldEditButton(idx, cb),
          delete: (cb) => createFieldDeleteButton(idx, cb),
        },
      }
    );

    /*
    const btnUp = createReorderUpButton(idx, idx === 0, () => {
      if (idx > 0) onUp ? onUp(idx) : onReorder?.(idx, idx - 1);
    });
    const btnDown = createReorderDownButton(idx, fields.length, () => {
      if (idx < fields.length - 1)
        onDown ? onDown(idx) : onReorder?.(idx, idx + 1);
    });

    actionsEl.appendChild(btnUp);
    actionsEl.appendChild(btnDown);
    */

    if (field.type === "loopstop") {
      fieldButtons.edit.disabled = true;
      fieldButtons.delete.disabled = true;
      fieldButtons.edit.classList.add("disabled");
      fieldButtons.delete.classList.add("disabled");
    }

    actionsWrapper.appendChild(
      buildButtonGroup(fieldButtons.edit, fieldButtons.delete, "field-actions")
    );

    item.appendChild(labelEl);
    item.appendChild(actionsWrapper);
    listEl.appendChild(item);
  }
}

export function createEmptyField() {
  return { key: "", type: "text", label: "" };
}

let cachedFieldEditModal = null;
let cachedFieldEditSetup = null;

export function showFieldEditorModal(field, allFields = [], onConfirm) {
  let editor;

  const { modal } = setupFieldEditModal(field, allFields, () => {
    const confirmedField = editor.getField();

    if (confirmedField.type === "looper") {
      const loopKey = confirmedField.key;
      const loopLabel = confirmedField.label || loopKey;

      const loopStart = {
        key: loopKey,
        label: loopLabel,
        type: "loopstart",
      };

      const loopStop = {
        key: loopKey,
        label: loopLabel,
        type: "loopstop",
      };

      onConfirm?.([loopStart, loopStop]);
    } else {
      onConfirm?.(confirmedField);
    }
  });

  const container = document.querySelector("#field-edit-modal .modal-body");
  if (!container) {
    EventBus.emit("logging:error", ["Modal body not found"]);
    return;
  }

  editor = setupFieldEditor(container, null, allFields);
  editor.setField(field);
  modal.show();

  // ensure cleanup on close
  const root = document.getElementById("field-edit-modal");
  const onClosed = () => {
    editor?.dispose?.();
    root?.removeEventListener?.("modal:closed", onClosed);
    root?.removeEventListener?.("hidden", onClosed);
  };
  // use whatever your modal emits; we listen to both just in case
  root?.addEventListener?.("modal:closed", onClosed);
  root?.addEventListener?.("hidden", onClosed);
}

export function renderFieldList(
  listEl,
  fields,
  { onEditIndex, onOpenEditModal }
) {
  listFields(listEl, fields, {
    onEdit: (idx) => {
      onEditIndex(idx);
      onOpenEditModal(fields[idx]);
    },
    onDelete: async (idx) => {
      const removed = fields[idx];
      const removedKey = removed.key;
      const removedLabel = removed.label || removed.key || "Unnamed field";
      const removedType = removed.type;

      const confirmed = await showConfirmModal(
        "special.field.delete.sure",
        `<div class="modal-message-highlight"><strong>${removedLabel}</strong></div>`,
        {
          okKey: "standard.delete",
          cancelKey: "standard.cancel",
          width: "auto",
          height: "auto",
        }
      );
      if (!confirmed) return;

      fields.splice(idx, 1);

      if (["loopstart", "loopstop"].includes(removedType)) {
        const partnerType =
          removedType === "loopstart" ? "loopstop" : "loopstart";

        const partnerIdx = fields.findIndex(
          (f) => f.key === removedKey && f.type === partnerType
        );

        if (partnerIdx !== -1) {
          fields.splice(partnerIdx, 1);
        }
      }

      renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
    },
    onReorder: (from, to) => {
      const moved = fields.splice(from, 1)[0];
      fields.splice(to, 0, moved);
      renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
    },
    onUp: (idx) => {
      if (idx > 0) {
        [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
        renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
      }
    },
    onDown: (idx) => {
      if (idx < fields.length - 1) {
        [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
        renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
      }
    },
  });
}

// — code editor wiring (JS for code via CM, plain textarea for LaTeX; "Default" stays the value editor)
function maybeSwapDefaultForCode(dom, fieldType, field = {}) {
  const row = dom.default?.closest(".modal-form-row");
  if (!row || !dom.default) return;

  const setStackedRow = (on) => row.classList.toggle("has-stacked", !!on);
  const isCode = fieldType === "code";
  const isLatex = fieldType === "latex";
  const isTextArea = dom.default.nodeName === "TEXTAREA";
  let labelEl = row.querySelector("label[for='edit-default']");

  // --- helpers
  const removeCodeMirror = () => {
    // capture stale wrappers before we destroy/recreate
    const stale = row ? Array.from(row.querySelectorAll(".CodeMirror")) : [];

    if (dom.__codeEditor) {
      destroyInlineCodeMirror(dom.__codeEditor);
      dom.__codeEditor = null;
    }

    if (dom.default && dom.default.nodeName === "TEXTAREA") {
      dom.default.style.removeProperty("display");
      dom.default.hidden = false;
    }

    // remove only the stale wrappers we captured (won't touch the new one)
    stale.forEach((w) => w.isConnected && w.remove());
  };

  const ensureDefaultLabel = () => {
    // If we switched from a stacked label, restore plain "Default"
    if (!labelEl || labelEl.querySelector?.(".label-subtext")) {
      const restored = document.createElement("label");
      restored.htmlFor = "edit-default";
      restored.className = labelEl?.className || "";
      restored.setAttribute("data-i18n", "standard.default.value");
      restored.textContent =
        (typeof t === "function" && t("standard.default.value")) ||
        "Default value";
      if (labelEl) labelEl.replaceWith(restored);
      else row.insertBefore(restored, row.firstChild);
      labelEl = restored;
    }
  };

  const stackLabel = (labelKey, subKey, fallbackMain, fallbackSub) => {
    const stacked = buildCompositeElementStacked({
      forId: "edit-default",
      labelKey,
      subKey,
      i18nEnabled: true,
      className: labelEl?.className || "",
    });

    const mainSpan = stacked.querySelector("span");
    if (
      mainSpan &&
      (!mainSpan.textContent || mainSpan.textContent === labelKey)
    ) {
      mainSpan.setAttribute("data-i18n", labelKey);
      mainSpan.textContent =
        (typeof t === "function" && t(labelKey)) || fallbackMain;
    }

    const subSmall = stacked.querySelector(".label-subtext");
    if (
      subSmall &&
      (!subSmall.textContent || subSmall.textContent === subKey)
    ) {
      subSmall.setAttribute("data-i18n", subKey);
      subSmall.textContent =
        (typeof t === "function" && t(subKey)) || fallbackSub;
    }

    if (labelEl) labelEl.replaceWith(stacked);
    else row.insertBefore(stacked, row.firstChild);
  };

  const swapToTextArea = (clsList = [], rows = 2, placeholder = "") => {
    if (!isTextArea) {
      const ta = document.createElement("textarea");
      ta.id = "edit-default";
      ta.rows = rows;
      ta.spellcheck = false;
      ta.autocapitalize = "off";
      ta.autocorrect = "off";
      ta.value = dom.default.value ?? "";
      clsList.forEach((c) => ta.classList.add(c));
      if (placeholder) ta.placeholder = placeholder;
      dom.default.replaceWith(ta);
      dom.default = ta;
    } else {
      dom.default.classList.remove("code-textarea", "latex-textarea");
      clsList.forEach((c) => dom.default.classList.add(c));
      dom.default.rows = rows;
      if (placeholder && !dom.default.placeholder)
        dom.default.placeholder = placeholder;
    }
  };

  // --- leave Code unless staying in Code
  if (!isCode) removeCodeMirror();

  // CODE → stacked label + CodeMirror over the Default textarea
  if (isCode) {
    swapToTextArea(["code-textarea"], 8);
    stackLabel(
      "field.code.label",
      "field.code.fullscreen",
      "Code",
      "Use F11 for fullscreen"
    );

    setStackedRow(true);

    const modal = document.getElementById("field-edit-modal");
    const modalBodyEl = modal?.querySelector(".modal-body") || null;
    dom.__codeEditor = createInlineCodeMirror(dom.default, {
      mode: "javascript",
      modalBodyEl,
      height: 140,
    });
    return;
  }

  // LATEX → stacked label (LaTeX + hint), plain textarea; placeholder is UI-only
  if (isLatex) {
    const rows = Math.max(2, Math.min(60, Number(field?.rows ?? 12)));
    const placeholder = "\\begin{center} ... \\end{center}";
    swapToTextArea(["latex-textarea"], rows, placeholder);

    stackLabel(
      "field.latex.label",
      "field.latex.hint",
      "LaTeX",
      "Raw \\LaTeX block (exported as fenced)"
    );

    setStackedRow(true);

    const modal = document.getElementById("field-edit-modal");
    const modalBodyEl = modal?.querySelector(".modal-body") || null;
    dom.__codeEditor = createInlineCodeMirror(dom.default, {
      mode: "stex",
      modalBodyEl,
      height: 140,
    });
    return;
  }

  // OTHER TYPES → simple <input type="text"> with normal "Default" label
  ensureDefaultLabel();
  if (isTextArea) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = "edit-default";
    inp.value = dom.default.value ?? "";
    dom.default.replaceWith(inp);
    dom.default = inp;

    setStackedRow(false);
  } else {
    dom.default.classList.remove("code-textarea", "latex-textarea");
  }
}
