// modules/csvImportModal.js

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
import { matchOption, parseAsList } from "../utils/stringUtils.js";
import { Toast } from "../utils/toastUtils.js";
import { t } from "../utils/i18n.js";

// Field types excluded from CSV mapping
const excludedTypes = new Set([
  "loopstart", "loopstop", "image", "code", "api",
]);

// ── Transform rules ───────────────────────────────────────────
// ── Transform rules ───────────────────────────────────────────
// Parameterised rules (first-n, last-n) receive the "n" arg at apply-time.
const transformRules = {
  none:         (v) => v,
  lowercase:    (v) => v.toLowerCase(),
  uppercase:    (v) => v.toUpperCase(),
  capitalize:   (v) => v.replace(/\b\w/g, (c) => c.toUpperCase()),
  trim:         (v) => v.trim(),
  "trim+lower": (v) => v.trim().toLowerCase(),
  "trim+upper": (v) => v.trim().toUpperCase(),
  "trim+cap":   (v) => v.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
  "first-n":    (v, n) => v.substring(0, n || v.length),
  "last-n":     (v, n) => n ? v.slice(-n) : v,
};

// Rules that need the numeric "n" input
const paramRules = new Set(["first-n", "last-n"]);

const transformOptions = [
  { value: "none",       label: t("csv.transform.none", "None") },
  { value: "trim",       label: t("csv.transform.trim", "Trim") },
  { value: "lowercase",  label: t("csv.transform.lowercase", "Lowercase") },
  { value: "uppercase",  label: t("csv.transform.uppercase", "Uppercase") },
  { value: "capitalize", label: t("csv.transform.capitalize", "Capitalize") },
  { value: "trim+lower", label: t("csv.transform.trimlower", "Trim + Lower") },
  { value: "trim+upper", label: t("csv.transform.trimupper", "Trim + Upper") },
  { value: "trim+cap",   label: t("csv.transform.trimcap", "Trim + Capitalize") },
  { value: "first-n",    label: t("csv.transform.firstn", "First N chars") },
  { value: "last-n",     label: t("csv.transform.lastn", "Last N chars") },
];

function applyTransform(val, ruleKey, n) {
  const fn = transformRules[ruleKey];
  return fn ? fn(val, n) : val;
}

/**
 * Quick inline coerce for preview display (mirrors csvHandlers.coerceValue).
 */
function previewCoerce(raw, field) {
  const val = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  switch (field.type) {
    case "boolean":
      return ["true", "1", "yes", "on"].includes(val.toLowerCase()) ? "true" : "false";
    case "number":
    case "range": {
      const n = Number(val);
      return Number.isFinite(n) ? String(n) : field.type === "range" ? "50" : "0";
    }
    case "dropdown":
    case "radio":
      return matchOption(val, field.options);
    case "multioption":
      return parseAsList(val).map((v) => matchOption(v, field.options)).join(", ");
    case "tags":
    case "list":
      return parseAsList(val).join(", ");
    default:
      return val;
  }
}

function formatPreview(val) {
  const s = String(val ?? "");
  return s.length > 50 ? s.substring(0, 47) + "..." : s;
}

/**
 * Build the mapping table with Transform, Preview + Transformed columns.
 */
function buildMappingTable(container, csvHeaders, templateFields, firstRow) {
  container.innerHTML = "";

  const mappableFields = templateFields.filter(
    (f) => f.key && !excludedTypes.has(f.type)
  );
  const fieldByKey = new Map(mappableFields.map((f) => [f.key, f]));

  const fieldOptions = [
    { value: "", label: `— ${t("csv.skip", "skip")} —` },
    ...mappableFields.map((f) => ({
      value: f.key,
      label: `${f.label || f.key} (${f.type})`,
    })),
  ];

  const table = document.createElement("table");
  table.className = "csv-mapping-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const text of [
    t("csv.column", "CSV Column"),
    t("csv.field", "Template Field"),
    t("csv.transform", "Transform"),
    t("csv.preview", "Preview"),
    t("csv.transformed", "Transformed"),
  ]) {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const dropdowns = {};
  const transforms = {};
  const nInputs = {};       // header → input element (for first-n / last-n)
  const rowUpdaters = [];   // functions to refresh all transformed cells (for concat)

  for (let i = 0; i < csvHeaders.length; i++) {
    const header = csvHeaders[i];
    const rawVal = firstRow && i < firstRow.length ? firstRow[i] : "";
    const row = document.createElement("tr");

    // CSV column name
    const tdCol = document.createElement("td");
    tdCol.textContent = header;
    tdCol.title = header;

    // Field dropdown
    const tdField = document.createElement("td");
    const dropContainer = document.createElement("div");
    dropContainer.className = "csv-map-dropdown";
    tdField.appendChild(dropContainer);

    const autoMatch = autoMatchField(header, mappableFields);

    // Transform dropdown + N-chars input
    const tdTransform = document.createElement("td");
    const transformWrap = document.createElement("div");
    transformWrap.className = "csv-transform-wrap";

    const transformContainer = document.createElement("div");
    transformContainer.className = "csv-map-dropdown";
    transformWrap.appendChild(transformContainer);

    const nInput = document.createElement("input");
    nInput.type = "number";
    nInput.min = "1";
    nInput.max = "999";
    nInput.className = "csv-n-input";
    nInput.placeholder = "N";
    nInput.style.display = "none";
    transformWrap.appendChild(nInput);
    nInputs[header] = nInput;

    tdTransform.appendChild(transformWrap);

    // Preview cell (raw)
    const tdPreview = document.createElement("td");
    tdPreview.className = "csv-preview-cell";
    tdPreview.textContent = formatPreview(rawVal);
    tdPreview.title = rawVal;

    // Transformed cell
    const tdTransformed = document.createElement("td");
    tdTransformed.className = "csv-transformed-cell";

    // State for this row
    let currentFieldKey = autoMatch;
    let currentRule = "none";
    let currentN = 0;

    function updateTransformed() {
      try {
        if (!currentFieldKey) {
          tdTransformed.textContent = "";
          tdTransformed.title = "";
          tdTransformed.classList.remove("csv-transformed-changed", "csv-transformed-concat");
          return;
        }
        const field = fieldByKey.get(currentFieldKey);
        if (!field) {
          tdTransformed.textContent = "?";
          return;
        }

        // Read N directly from DOM (don't rely on event-set variable)
        const liveN = parseInt(nInput.value) || 0;

        // Apply this row's own transform
        const myVal = applyTransform(rawVal, currentRule, liveN);

        // Check for concat: other rows also targeting the same field
        const allReady = Object.keys(dropdowns).length === csvHeaders.length;
        let isConcat = false;
        let combined = myVal;

        if (allReady) {
          const parts = [];
          for (let j = 0; j < csvHeaders.length; j++) {
            const oh = csvHeaders[j];
            if (!dropdowns[oh] || dropdowns[oh].getSelected() !== currentFieldKey) continue;
            const oRaw = firstRow && j < firstRow.length ? firstRow[j] : "";
            const oRule = transforms[oh] ? transforms[oh].getSelected() : "none";
            const oN = nInputs[oh] ? (parseInt(nInputs[oh].value) || 0) : 0;
            parts.push(applyTransform(oRaw, oRule, oN));
          }
          if (parts.length > 1) {
            isConcat = true;
            combined = parts.join(concatSepInput?.value ?? " ");
          }
        }

        const transformed = previewCoerce(combined, field);
        tdTransformed.textContent = formatPreview(transformed);
        tdTransformed.title = transformed;
        tdTransformed.classList.toggle("csv-transformed-changed", transformed !== rawVal.trim());
        tdTransformed.classList.toggle("csv-transformed-concat", isConcat);
      } catch (err) {
        tdTransformed.textContent = `ERR: ${err.message}`;
      }
    }

    const dd = createDropdown({
      containerEl: dropContainer,
      labelTextOrKey: "",
      options: fieldOptions,
      selectedValue: autoMatch,
      onChange: (val) => {
        currentFieldKey = val;
        // Refresh all rows (concat may have changed)
        rowUpdaters.forEach((fn) => fn());
      },
    });

    const tfDd = createDropdown({
      containerEl: transformContainer,
      labelTextOrKey: "",
      options: transformOptions,
      selectedValue: "none",
      onChange: (val) => {
        currentRule = val;
        nInput.style.display = paramRules.has(val) ? "" : "none";
        if (!paramRules.has(val)) { nInput.value = ""; currentN = 0; }
        rowUpdaters.forEach((fn) => fn());
      },
    });

    const onNChange = () => {
      currentN = parseInt(nInput.value) || 0;
      rowUpdaters.forEach((fn) => fn());
    };
    nInput.addEventListener("input", onNChange);
    nInput.addEventListener("change", onNChange);

    dropdowns[header] = dd;
    transforms[header] = tfDd;
    rowUpdaters.push(updateTransformed);

    // Show initial transform if auto-matched
    if (autoMatch) updateTransformed();

    row.append(tdCol, tdField, tdTransform, tdPreview, tdTransformed);
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);

  // Concat hint + separator (returned separately, caller places it outside the table container)
  const concatRow = document.createElement("div");
  concatRow.className = "csv-concat-row";

  const concatHint = document.createElement("span");
  concatHint.className = "csv-concat-hint";
  concatHint.textContent = t("csv.concat.hint", "Map multiple columns to the same field to concatenate.");

  const concatSepLabel = document.createElement("label");
  concatSepLabel.className = "csv-concat-sep-label";
  concatSepLabel.textContent = t("csv.concat.separator", "Separator:");

  const concatSepInput = document.createElement("input");
  concatSepInput.type = "text";
  concatSepInput.value = " ";
  concatSepInput.className = "csv-concat-sep-input";
  concatSepInput.title = t("csv.concat.separator.title", "Character(s) used to join concatenated values");
  concatSepInput.addEventListener("input", () => {
    rowUpdaters.forEach((fn) => fn());
  });

  concatRow.append(concatHint, concatSepLabel, concatSepInput);

  return { dropdowns, transforms, nInputs, concatSepInput, concatRow, table };
}

/**
 * Try to auto-match a CSV header to a template field key or label.
 */
function autoMatchField(csvHeader, fields) {
  const norm = csvHeader.trim().toLowerCase().replace(/[\s_-]+/g, "");
  for (const f of fields) {
    const normKey = f.key.toLowerCase().replace(/[\s_-]+/g, "");
    const normLabel = (f.label || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (normKey === norm || normLabel === norm) return f.key;
  }
  return "";
}

/**
 * Collect the mapping from dropdowns: { csvColumn: fieldKey }
 */
function collectMapping(dropdowns) {
  const mapping = {};
  for (const [csvCol, dd] of Object.entries(dropdowns)) {
    const val = dd.getSelected();
    if (val) mapping[csvCol] = val;
  }
  return mapping;
}

/**
 * Collect the transform rules from dropdowns: { csvColumn: { rule, n? } }
 */
function collectTransforms(transformDds, nInputs) {
  const transforms = {};
  for (const [csvCol, dd] of Object.entries(transformDds)) {
    const rule = dd.getSelected();
    if (rule && rule !== "none") {
      const entry = { rule };
      if (paramRules.has(rule) && nInputs[csvCol]) {
        entry.n = parseInt(nInputs[csvCol].value) || 0;
      }
      transforms[csvCol] = entry;
    }
  }
  return transforms;
}

/**
 * Resolve the current template filename (always ending in .yaml).
 */
function getTemplateFilename() {
  const name = window.currentSelectedTemplateName || "";
  return name.endsWith(".yaml") ? name : name ? `${name}.yaml` : "";
}

// ── Public: setup and return the modal ─────────────────────────

export function setupCsvImportModal() {
  const modal = setupModal("csv-import-modal", {
    closeBtn: "csv-import-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "68em",
    height: "auto",
    maxHeight: "80vh",
    onOpen: () => initModalState(),
  });

  // State
  let csvFilePath = null;
  let csvHeaders = [];
  let csvRows = [];
  let dropdowns = {};
  let transformDds = {};
  let nInputsMap = {};
  let concatSepEl = null;
  let selectedDelimiter = ",";
  let filenameFieldKey = "";
  let templateFields = [];

  function initModalState() {
    csvFilePath = null;
    csvHeaders = [];
    csvRows = [];
    dropdowns = {};
    transformDds = {};
    nInputsMap = {};
    filenameFieldKey = "";
    templateFields = [];

    const tmpl = window.currentSelectedTemplate;
    if (!tmpl || !tmpl.enable_collection) {
      Toast.error("csv.error.no.template");
      return;
    }
    templateFields = tmpl.fields || [];

    const body = document.getElementById("csv-import-body");
    if (!body) return;
    body.innerHTML = "";

    // ── Template info ─────────────────────────────────────────
    const templateInfo = document.createElement("div");
    templateInfo.className = "csv-import-step";
    const infoLabel = createStyledLabel(
      `${t("csv.template", "Template")}: ${tmpl.name || getTemplateFilename().replace(/\.yaml$/, "")}`,
      { className: "csv-template-info" }
    );
    templateInfo.appendChild(infoLabel);

    // ── File picker + delimiter ───────────────────────────────
    const step1 = document.createElement("div");
    step1.className = "csv-import-step";

    const fileRow = document.createElement("div");
    fileRow.className = "csv-import-row";

    const fileBtn = createButton({
      text: t("csv.choose.file", "Choose CSV file..."),
      className: "btn-default",
      identifier: "csv-choose-file",
      onClick: async () => {
        const path = await window.api.dialog.chooseFile();
        if (!path) return;
        csvFilePath = path;
        fileLabel.textContent = path.split(/[/\\]/).pop();
        fileLabel.title = path;
        await loadPreview();
      },
    });

    const fileLabel = document.createElement("span");
    fileLabel.className = "csv-file-label";
    fileLabel.textContent = t("csv.no.file", "No file selected");

    const delimContainer = document.createElement("div");
    delimContainer.className = "csv-delim-container";

    createDropdown({
      containerEl: delimContainer,
      labelTextOrKey: "csv.delimiter",
      options: [
        { value: ",", label: t("csv.delimiter.comma", "Comma (,)") },
        { value: ";", label: t("csv.delimiter.semicolon", "Semicolon (;)") },
        { value: "\t", label: t("csv.delimiter.tab", "Tab") },
        { value: "|", label: t("csv.delimiter.pipe", "Pipe (|)") },
      ],
      selectedValue: ",",
      onChange: async (val) => {
        selectedDelimiter = val;
        if (csvFilePath) await loadPreview();
      },
      i18nEnabled: true,
    });

    fileRow.append(fileBtn, fileLabel, delimContainer);
    step1.appendChild(fileRow);

    // ── Mapping + preview ─────────────────────────────────────
    const mappingContainer = document.createElement("div");
    mappingContainer.className = "csv-mapping-container";
    mappingContainer.id = "csv-mapping-container";

    // ── Filename field selector ───────────────────────────────
    const filenameContainer = document.createElement("div");
    filenameContainer.className = "csv-import-step";
    filenameContainer.id = "csv-filename-field-container";

    // ── Progress bar ──────────────────────────────────────────
    const progressWrap = document.createElement("div");
    progressWrap.className = "csv-progress-wrap";
    progressWrap.id = "csv-progress-wrap";
    progressWrap.style.display = "none";

    const progressBar = document.createElement("div");
    progressBar.className = "csv-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "csv-progress-fill";
    progressFill.id = "csv-progress-fill";

    progressBar.appendChild(progressFill);
    progressWrap.appendChild(progressBar);

    const progressLabel = document.createElement("span");
    progressLabel.className = "csv-progress-label";
    progressLabel.id = "csv-progress-label";
    progressWrap.appendChild(progressLabel);

    // ── Status + buttons ──────────────────────────────────────
    const statusEl = document.createElement("div");
    statusEl.className = "csv-import-status";
    statusEl.id = "csv-import-status";

    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = "csv-import-buttons";

    const importBtn = createConfirmButton({
      text: t("csv.import", "Import"),
      id: "csv-import-confirm",
      onClick: () => runImport(),
    });

    const cancelBtn = createCancelButton({
      text: t("standard.cancel", "Cancel"),
      id: "csv-import-cancel",
      onClick: () => modal.hide(),
    });

    buttonsWrapper.appendChild(buildButtonGroup(importBtn, cancelBtn));

    body.append(templateInfo, step1, mappingContainer, filenameContainer, progressWrap, statusEl, buttonsWrapper);
  }

  async function loadPreview() {
    if (!csvFilePath) return;

    const result = await EventBus.emitWithResponse("csv:preview", {
      filePath: csvFilePath,
      delimiter: selectedDelimiter,
    });

    if (result.error) {
      Toast.error("csv.error.parse", [result.error]);
      return;
    }

    csvHeaders = result.headers || [];
    csvRows = result.rows || [];

    const status = document.getElementById("csv-import-status");
    if (status) {
      status.textContent = t("csv.rows.found", [result.rowCount]);
    }

    if (csvHeaders.length > 0) {
      buildMapping();
    }
  }

  function buildMapping() {
    const container = document.getElementById("csv-mapping-container");
    if (!container || csvHeaders.length === 0 || templateFields.length === 0) return;

    const firstRow = csvRows.length > 0 ? csvRows[0] : null;
    const result = buildMappingTable(container, csvHeaders, templateFields, firstRow);
    dropdowns = result.dropdowns;
    transformDds = result.transforms;
    nInputsMap = result.nInputs;
    concatSepEl = result.concatSepInput;

    // Place concat row after the mapping container (outside the scrollable area)
    const oldConcat = container.parentNode?.querySelector(".csv-concat-row");
    if (oldConcat) oldConcat.remove();
    container.after(result.concatRow);

    // Build filename-field dropdown
    buildFilenameFieldDropdown();
  }

  function buildFilenameFieldDropdown() {
    const container = document.getElementById("csv-filename-field-container");
    if (!container) return;
    container.innerHTML = "";

    const mappableFields = templateFields.filter(
      (f) => f.key && !excludedTypes.has(f.type)
    );

    const options = [
      { value: "", label: `— ${t("csv.auto.filename", "Auto-generate filename")} —` },
      ...mappableFields.map((f) => ({
        value: f.key,
        label: `${f.label || f.key} (${f.key})`,
      })),
    ];

    createDropdown({
      containerEl: container,
      labelTextOrKey: "csv.filename.field",
      options,
      selectedValue: "",
      onChange: (val) => {
        filenameFieldKey = val;
      },
      i18nEnabled: true,
    });
  }

  async function runImport() {
    const templateFilename = getTemplateFilename();
    const tmpl = window.currentSelectedTemplate;

    if (!csvFilePath) {
      Toast.error("csv.error.no.file");
      return;
    }
    if (!templateFilename || !tmpl) {
      Toast.error("csv.error.no.template");
      return;
    }

    const mapping = collectMapping(dropdowns);
    const transforms = collectTransforms(transformDds, nInputsMap);
    if (Object.keys(mapping).length === 0) {
      Toast.error("csv.error.no.mapping");
      return;
    }

    modal.setDisabled();

    // Show progress bar
    const progressWrap = document.getElementById("csv-progress-wrap");
    const progressFill = document.getElementById("csv-progress-fill");
    const progressLabel = document.getElementById("csv-progress-label");
    const status = document.getElementById("csv-import-status");

    if (progressWrap) progressWrap.style.display = "";
    if (progressFill) progressFill.style.width = "0%";
    if (status) status.textContent = t("csv.importing", "Importing...");

    // GUID field key
    const guidField = templateFields.find((f) => f.type === "guid");
    const guidFieldKey = guidField ? guidField.key : "";

    // Listen for per-row progress
    const onProgress = ({ row, total, imported, skipped }) => {
      const pct = Math.round((row / total) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `${row} / ${total}`;
      if (status) status.textContent = `${imported} imported, ${skipped} skipped`;
    };
    EventBus.on("csv:import:progress", onProgress);

    try {
      const result = await EventBus.emitWithResponse("csv:import", {
        rows: csvRows,
        headers: csvHeaders,
        templateFilename,
        mapping,
        transforms,
        concatSeparator: concatSepEl?.value ?? " ",
        fields: templateFields,
        filenameField: filenameFieldKey,
        guidFieldKey,
      });

      if (progressFill) progressFill.style.width = "100%";

      if (result.success) {
        Toast.success("csv.import.success", [result.imported]);
        if (status) {
          status.textContent = `${result.imported} imported, ${result.skipped} skipped`;
        }

        EventBus.emit("form:list:reload");
        const templateName = templateFilename.replace(/\.yaml$/, "");
        EventBus.emit("vfs:refreshTemplate", { templateName });
      } else {
        Toast.error("csv.import.failed");
        if (status) {
          status.textContent = result.errors?.join("; ") || "Import failed";
        }
      }

      if (result.errors?.length) {
        EventBus.emit("logging:warning", ["[CsvImport] Errors:", ...result.errors]);
      }
    } catch (err) {
      Toast.error("csv.import.failed");
      EventBus.emit("logging:error", ["[CsvImport] Import failed:", err]);
    } finally {
      EventBus.off("csv:import:progress", onProgress);
      modal.setEnabled();
    }
  }

  return modal;
}
