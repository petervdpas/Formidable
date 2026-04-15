// modules/csvExportModal.js

import { EventBus } from "./eventBus.js";
import { setupModal } from "../utils/modalUtils.js";
import { createDropdown } from "../utils/dropdownUtils.js";
import {
  buildButtonGroup,
  createConfirmButton,
  createCancelButton,
  createButton,
} from "../utils/buttonUtils.js";
import { createStyledLabel } from "../utils/elementBuilders.js";
import { Toast } from "../utils/toastUtils.js";
import { t } from "../utils/i18n.js";
import {
  excludedTypes,
  paramRuleDefs,
  getTransformOptions,
  applyTransformRule,
  formatValue,
} from "../utils/csvTransforms.js";

function formatPreview(val) {
  const s = String(val ?? "");
  return s.length > 50 ? s.substring(0, 47) + "..." : s;
}

function getTemplateFilename() {
  const name = window.currentSelectedTemplateName || "";
  return name.endsWith(".yaml") ? name : name ? `${name}.yaml` : "";
}

/**
 * Build one editable row in the export columns table.
 * Returns an accessor object: { getSpec, refresh, row, isComputed }
 *
 * Column spec shape:
 *   { header, sourceKeys: [fieldKey,...], separator?, transform?: { rule, param } }
 */
function buildColumnRow({
  initial,
  isComputed,
  mappableFields,
  fieldByKey,
  sampleEntry,
  refreshAll,
}) {
  const row = document.createElement("tr");
  let enabled = initial.enabled !== false;
  let header = initial.header || "";
  let sourceKeys = [...(initial.sourceKeys || [])];
  let separator = initial.separator ?? " ";
  let currentRule = initial.transform?.rule || "none";

  // ── Include checkbox ──
  const tdChk = document.createElement("td");
  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.checked = enabled;
  chk.addEventListener("change", () => {
    enabled = chk.checked;
    row.classList.toggle("csv-row-disabled", !enabled);
    refreshAll();
  });
  tdChk.appendChild(chk);

  // ── Source field(s) ──
  const tdSource = document.createElement("td");
  const sourceWrap = document.createElement("div");
  sourceWrap.className = "csv-source-wrap";
  tdSource.appendChild(sourceWrap);

  function renderSource() {
    sourceWrap.innerHTML = "";
    if (isComputed) {
      // Chips for each source + add dropdown + separator input
      const chips = document.createElement("div");
      chips.className = "csv-source-chips";

      sourceKeys.forEach((key, idx) => {
        const chip = document.createElement("span");
        chip.className = "csv-source-chip";
        const field = fieldByKey.get(key);
        chip.textContent = field ? (field.label || field.key) : key;
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "csv-chip-remove";
        rm.textContent = "×";
        rm.title = t("standard.remove", "Remove");
        rm.addEventListener("click", () => {
          sourceKeys.splice(idx, 1);
          renderSource();
          refreshAll();
        });
        chip.appendChild(rm);
        chips.appendChild(chip);
      });

      const addContainer = document.createElement("div");
      addContainer.className = "csv-source-add";
      const remaining = mappableFields
        .filter((f) => !sourceKeys.includes(f.key))
        .map((f) => ({ value: f.key, label: `${f.label || f.key} (${f.type})` }));
      if (remaining.length > 0) {
        createDropdown({
          containerEl: addContainer,
          labelTextOrKey: "",
          options: [{ value: "", label: `+ ${t("csv.export.add.field", "Add field")}` }, ...remaining],
          selectedValue: "",
          onChange: (val) => {
            if (!val) return;
            sourceKeys.push(val);
            renderSource();
            refreshAll();
          },
        });
      }

      sourceWrap.appendChild(chips);
      sourceWrap.appendChild(addContainer);
    } else {
      // Single field — fixed label
      const key = sourceKeys[0];
      const field = fieldByKey.get(key);
      const label = document.createElement("span");
      label.className = "csv-source-label";
      label.textContent = field ? `${field.label || field.key} (${field.type})` : key;
      sourceWrap.appendChild(label);
    }
  }

  renderSource();

  // ── Header (CSV column name) ──
  const tdHeader = document.createElement("td");
  const headerInput = document.createElement("input");
  headerInput.type = "text";
  headerInput.value = header;
  headerInput.className = "csv-header-input";
  headerInput.addEventListener("input", () => {
    header = headerInput.value;
  });
  tdHeader.appendChild(headerInput);

  // ── Separator (computed only) ──
  const tdSeparator = document.createElement("td");
  if (isComputed) {
    const sepInput = document.createElement("input");
    sepInput.type = "text";
    sepInput.value = separator;
    sepInput.className = "csv-concat-sep-input";
    sepInput.title = t("csv.concat.separator.title", "Character(s) used to join concatenated values");
    sepInput.addEventListener("input", () => {
      separator = sepInput.value;
      refreshAll();
    });
    tdSeparator.appendChild(sepInput);
  } else {
    tdSeparator.textContent = "—";
    tdSeparator.className = "csv-cell-dim";
  }

  // ── Transform ──
  const tdTransform = document.createElement("td");
  const transformWrap = document.createElement("div");
  transformWrap.className = "csv-transform-wrap";
  const transformContainer = document.createElement("div");
  transformContainer.className = "csv-map-dropdown";
  transformWrap.appendChild(transformContainer);

  const paramInput = document.createElement("input");
  paramInput.className = "csv-param-input";
  paramInput.style.display = "none";
  transformWrap.appendChild(paramInput);

  tdTransform.appendChild(transformWrap);

  createDropdown({
    containerEl: transformContainer,
    labelTextOrKey: "",
    options: getTransformOptions(),
    selectedValue: currentRule,
    onChange: (val) => {
      currentRule = val;
      const def = paramRuleDefs[val];
      if (def) {
        paramInput.type = def.type || "text";
        paramInput.placeholder = def.placeholder ?? t("csv.transform.boolmatch.placeholder", "= true");
        if (def.min) paramInput.min = def.min;
        if (def.max) paramInput.max = def.max;
        paramInput.style.display = "";
      } else {
        paramInput.style.display = "none";
        paramInput.value = "";
      }
      refreshAll();
    },
  });

  const onParamChange = () => refreshAll();
  paramInput.addEventListener("input", onParamChange);
  paramInput.addEventListener("change", onParamChange);

  // ── Preview cell ──
  const tdPreview = document.createElement("td");
  tdPreview.className = "csv-preview-cell";

  // ── Remove row button (computed only) ──
  const tdActions = document.createElement("td");
  tdActions.className = "csv-actions-cell";
  if (isComputed) {
    const rmBtn = createButton({
      text: "×",
      className: "btn-default csv-row-remove",
      onClick: () => {
        row.remove();
        accessor.removed = true;
        refreshAll();
      },
    });
    tdActions.appendChild(rmBtn);
  }

  row.append(tdChk, tdSource, tdHeader, tdSeparator, tdTransform, tdPreview, tdActions);

  const accessor = {
    row,
    isComputed,
    removed: false,
    get enabled() { return enabled; },
    getSpec() {
      if (!enabled || sourceKeys.length === 0) return null;
      const spec = { header: header || sourceKeys[0], sourceKeys: [...sourceKeys] };
      if (isComputed) spec.separator = separator;
      if (currentRule && currentRule !== "none") {
        const def = paramRuleDefs[currentRule];
        spec.transform = { rule: currentRule };
        if (def) {
          spec.transform.param = def.type === "number"
            ? (parseInt(paramInput.value) || 0)
            : (paramInput.value || "");
        }
      }
      return spec;
    },
    refresh() {
      if (!sampleEntry || sourceKeys.length === 0 || !enabled) {
        tdPreview.textContent = enabled ? "" : "—";
        tdPreview.title = "";
        return;
      }
      const parts = sourceKeys.map((key) => {
        const field = fieldByKey.get(key);
        return field ? formatValue(sampleEntry[key], field) : "";
      });
      const joined = parts.length === 1 ? parts[0] : parts.join(separator);
      const def = paramRuleDefs[currentRule];
      const liveParam = def?.type === "number"
        ? (parseInt(paramInput.value) || 0)
        : (paramInput.value || "");
      const transformed = applyTransformRule(
        joined,
        { rule: currentRule, param: liveParam },
        { mode: "preview" }
      );
      tdPreview.textContent = formatPreview(transformed);
      tdPreview.title = transformed;
    },
  };

  return accessor;
}

export function setupCsvExportModal() {
  const modal = setupModal("csv-export-modal", {
    closeBtn: "csv-export-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "72em",
    height: "auto",
    maxHeight: "85vh",
    onOpen: () => initModalState(),
  });

  let templateFields = [];
  let mappableFields = [];
  let fieldByKey = new Map();
  let sampleEntry = null;
  let rowAccessors = [];
  let tbodyEl = null;
  let selectedDelimiter = ",";

  function refreshAll() {
    rowAccessors = rowAccessors.filter((a) => !a.removed);
    rowAccessors.forEach((a) => a.refresh());
  }

  function addColumnRow(isComputed, initial = {}) {
    const accessor = buildColumnRow({
      initial,
      isComputed,
      mappableFields,
      fieldByKey,
      sampleEntry,
      refreshAll,
    });
    rowAccessors.push(accessor);
    if (tbodyEl) tbodyEl.appendChild(accessor.row);
    accessor.refresh();
    return accessor;
  }

  async function loadSampleEntry(templateFilename) {
    try {
      const files = await window.api.forms.listForms(templateFilename);
      if (!files || files.length === 0) return null;
      const tmpl = window.currentSelectedTemplate;
      const form = await window.api.forms.loadForm(templateFilename, files[0], tmpl.fields);
      return form?.data || null;
    } catch {
      return null;
    }
  }

  async function initModalState() {
    const tmpl = window.currentSelectedTemplate;
    const templateFilename = getTemplateFilename();
    if (!tmpl || !tmpl.enable_collection || !templateFilename) {
      Toast.error("csv.error.no.template");
      return;
    }

    templateFields = tmpl.fields || [];
    mappableFields = templateFields.filter(
      (f) => f.key && !excludedTypes.has(f.type)
    );
    fieldByKey = new Map(mappableFields.map((f) => [f.key, f]));
    rowAccessors = [];

    const body = document.getElementById("csv-export-body");
    if (!body) return;
    body.innerHTML = "";

    // ── Template info ──
    const info = document.createElement("div");
    info.className = "csv-import-step";
    info.appendChild(createStyledLabel(
      `${t("csv.template", "Template")}: ${tmpl.name || templateFilename.replace(/\.yaml$/, "")}`,
      { className: "csv-template-info" }
    ));

    // ── Delimiter ──
    const delimStep = document.createElement("div");
    delimStep.className = "csv-import-step";
    const delimRow = document.createElement("div");
    delimRow.className = "csv-import-row";
    const delimContainer = document.createElement("div");
    delimContainer.className = "csv-delim-container";
    createDropdown({
      containerEl: delimContainer,
      labelTextOrKey: "csv.delimiter",
      options: [
        { value: ",",  label: t("csv.delimiter.comma", "Comma (,)") },
        { value: ";",  label: t("csv.delimiter.semicolon", "Semicolon (;)") },
        { value: "\t", label: t("csv.delimiter.tab", "Tab") },
        { value: "|",  label: t("csv.delimiter.pipe", "Pipe (|)") },
      ],
      selectedValue: selectedDelimiter,
      onChange: (val) => { selectedDelimiter = val; },
      i18nEnabled: true,
    });
    delimRow.appendChild(delimContainer);
    delimStep.appendChild(delimRow);

    // Sample entry for preview
    sampleEntry = await loadSampleEntry(templateFilename);

    // ── Columns table ──
    const tableWrap = document.createElement("div");
    tableWrap.className = "csv-mapping-container";

    const table = document.createElement("table");
    table.className = "csv-mapping-table csv-export-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const key of [
      "csv.export.include",
      "csv.export.source",
      "csv.column",
      "csv.export.separator",
      "csv.transform",
      "csv.preview",
      "csv.export.actions",
    ]) {
      const th = document.createElement("th");
      th.textContent = t(key, {
        "csv.export.include": "Include",
        "csv.export.source": "Source field(s)",
        "csv.column": "CSV Column",
        "csv.export.separator": "Sep.",
        "csv.transform": "Transform",
        "csv.preview": "Preview",
        "csv.export.actions": "",
      }[key]);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    tbodyEl = document.createElement("tbody");
    table.appendChild(tbodyEl);
    tableWrap.appendChild(table);

    // One default row per mappable field
    for (const f of mappableFields) {
      addColumnRow(false, {
        enabled: true,
        header: f.key,
        sourceKeys: [f.key],
      });
    }

    // ── Below-table actions row ──
    const actionRow = document.createElement("div");
    actionRow.className = "csv-export-actions-row";

    const addComputedBtn = createButton({
      text: t("csv.export.add.computed", "+ Add computed column"),
      className: "btn-default",
      onClick: () => {
        addColumnRow(true, {
          enabled: true,
          header: t("csv.export.computed.default", "computed"),
          sourceKeys: [],
          separator: " ",
        });
      },
    });
    actionRow.appendChild(addComputedBtn);

    // ── Status + Export/Cancel ──
    const statusEl = document.createElement("div");
    statusEl.className = "csv-import-status";
    statusEl.id = "csv-export-status";

    const progressWrap = document.createElement("div");
    progressWrap.className = "csv-progress-wrap";
    progressWrap.id = "csv-export-progress-wrap";
    progressWrap.style.display = "none";
    const progressBar = document.createElement("div");
    progressBar.className = "csv-progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "csv-progress-fill";
    progressFill.id = "csv-export-progress-fill";
    progressBar.appendChild(progressFill);
    progressWrap.appendChild(progressBar);
    const progressLabel = document.createElement("span");
    progressLabel.className = "csv-progress-label";
    progressLabel.id = "csv-export-progress-label";
    progressWrap.appendChild(progressLabel);

    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = "csv-import-buttons";

    const exportBtn = createConfirmButton({
      text: t("csv.export", "Export"),
      id: "csv-export-confirm",
      onClick: () => runExport(templateFilename),
    });
    const cancelBtn = createCancelButton({
      text: t("standard.cancel", "Cancel"),
      id: "csv-export-cancel",
      onClick: () => modal.hide(),
    });
    buttonsWrapper.appendChild(buildButtonGroup(exportBtn, cancelBtn));

    body.append(info, delimStep, tableWrap, actionRow, progressWrap, statusEl, buttonsWrapper);
  }

  async function runExport(templateFilename) {
    const columns = rowAccessors
      .map((a) => a.getSpec())
      .filter(Boolean);

    if (columns.length === 0) {
      Toast.error("csv.export.error.no.columns");
      return;
    }

    const templateName = templateFilename.replace(/\.yaml$/, "");
    const filePath = await window.api.dialog.chooseSaveFile({
      defaultPath: `${templateName}-export.csv`,
      extensions: ["csv"],
    });
    if (!filePath) return;

    modal.setDisabled();

    const progressWrap = document.getElementById("csv-export-progress-wrap");
    const progressFill = document.getElementById("csv-export-progress-fill");
    const progressLabel = document.getElementById("csv-export-progress-label");
    const status = document.getElementById("csv-export-status");

    if (progressWrap) progressWrap.style.display = "";
    if (progressFill) progressFill.style.width = "0%";
    if (status) status.textContent = t("csv.exporting", "Exporting...");

    const onProgress = ({ current, total }) => {
      const pct = Math.round((current / total) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `${current} / ${total}`;
    };
    EventBus.on("csv:export:progress", onProgress);

    try {
      const result = await EventBus.emitWithResponse("csv:export", {
        templateFilename,
        columns,
        filePath,
        delimiter: selectedDelimiter,
      });

      if (progressFill) progressFill.style.width = "100%";

      if (result?.success) {
        if (status) status.textContent = t("csv.export.done", "Export complete.");
      } else {
        Toast.error("csv.export.failed");
        if (status) status.textContent = result?.error || "Export failed";
      }
    } catch (err) {
      Toast.error("csv.export.failed");
      EventBus.emit("logging:error", ["[CsvExport] Export failed:", err]);
    } finally {
      EventBus.off("csv:export:progress", onProgress);
      modal.setEnabled();
    }
  }

  return modal;
}
