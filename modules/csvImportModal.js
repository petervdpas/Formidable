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
import { Toast } from "../utils/toastUtils.js";
import { t } from "../utils/i18n.js";

// Field types excluded from CSV mapping
const excludedTypes = new Set([
  "loopstart", "loopstop", "image", "code", "api",
]);

/**
 * Build the mapping table: one row per CSV column, each with a dropdown to pick a template field.
 */
function buildMappingTable(container, csvHeaders, templateFields) {
  container.innerHTML = "";

  const mappableFields = templateFields.filter(
    (f) => f.key && !excludedTypes.has(f.type)
  );

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

  const thCsv = document.createElement("th");
  thCsv.textContent = t("csv.column", "CSV Column");
  const thField = document.createElement("th");
  thField.textContent = t("csv.field", "Template Field");
  const thPreview = document.createElement("th");
  thPreview.textContent = t("csv.preview", "Preview");

  headRow.append(thCsv, thField, thPreview);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const dropdowns = {};

  for (const header of csvHeaders) {
    const row = document.createElement("tr");

    // CSV column name
    const tdCol = document.createElement("td");
    tdCol.textContent = header;
    tdCol.title = header;

    // Dropdown for field selection
    const tdField = document.createElement("td");
    const dropContainer = document.createElement("div");
    dropContainer.className = "csv-map-dropdown";
    tdField.appendChild(dropContainer);

    // Auto-match: find field with matching key or label
    const autoMatch = autoMatchField(header, mappableFields);

    const dd = createDropdown({
      containerEl: dropContainer,
      labelTextOrKey: "",
      options: fieldOptions,
      selectedValue: autoMatch,
    });

    dropdowns[header] = dd;

    // Preview cell (filled after file load)
    const tdPreview = document.createElement("td");
    tdPreview.className = "csv-preview-cell";
    tdPreview.dataset.csvHeader = header;

    row.append(tdCol, tdField, tdPreview);
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);

  return { dropdowns, table };
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
 * Fill preview cells with first-row data.
 */
function fillPreviewCells(tbody, csvHeaders, firstRow) {
  if (!firstRow) return;
  for (let i = 0; i < csvHeaders.length; i++) {
    const cell = tbody.querySelector(`td[data-csv-header="${CSS.escape(csvHeaders[i])}"]`);
    if (cell) {
      const val = i < firstRow.length ? firstRow[i] : "";
      cell.textContent = val.length > 60 ? val.substring(0, 57) + "..." : val;
      cell.title = val;
    }
  }
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
    width: "52em",
    height: "auto",
    maxHeight: "80vh",
    onOpen: () => initModalState(),
  });

  // State
  let csvFilePath = null;
  let csvHeaders = [];
  let csvRows = [];
  let dropdowns = {};
  let selectedDelimiter = ",";
  let filenameFieldKey = "";
  let templateFields = [];

  function initModalState() {
    csvFilePath = null;
    csvHeaders = [];
    csvRows = [];
    dropdowns = {};
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

    body.append(templateInfo, step1, mappingContainer, filenameContainer, statusEl, buttonsWrapper);
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

    const result = buildMappingTable(container, csvHeaders, templateFields);
    dropdowns = result.dropdowns;

    // Fill preview from first row
    if (csvRows.length > 0) {
      fillPreviewCells(result.table.querySelector("tbody"), csvHeaders, csvRows[0]);
    }

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

    if (!csvFilePath) {
      Toast.error("csv.error.no.file");
      return;
    }
    if (!templateFilename) {
      Toast.error("csv.error.no.template");
      return;
    }

    const mapping = collectMapping(dropdowns);
    if (Object.keys(mapping).length === 0) {
      Toast.error("csv.error.no.mapping");
      return;
    }

    modal.setDisabled();
    const status = document.getElementById("csv-import-status");
    if (status) status.textContent = t("csv.importing", "Importing...");

    try {
      const result = await EventBus.emitWithResponse("csv:import", {
        filePath: csvFilePath,
        templateFilename,
        mapping,
        delimiter: selectedDelimiter,
        filenameField: filenameFieldKey,
      });

      if (result.success) {
        Toast.success("csv.import.success", [result.imported]);
        if (status) {
          status.textContent = `${result.imported} imported, ${result.skipped} skipped`;
        }

        // Refresh the storage list
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
        EventBus.emit("logging:warning", [
          "[CsvImport] Errors:", ...result.errors,
        ]);
      }
    } catch (err) {
      Toast.error("csv.import.failed");
      EventBus.emit("logging:error", ["[CsvImport] Import failed:", err]);
    } finally {
      modal.setEnabled();
    }
  }

  return modal;
}
