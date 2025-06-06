// modules/formRenderer.js

import { buildHiddenInput } from "../utils/elementBuilders.js";
import {
  renderFieldElement,
  injectFieldDefaults,
  collectLoopGroup,
  createLoopDefaults,
} from "../utils/formUtils.js";
import { applyFieldValues, focusFirstInput } from "../utils/domUtils.js";
import {
  createFlaggedToggleButton,
  createFormSaveButton,
  createFormDeleteButton,
  createFormRenderButton,
  createAddLoopItemButton,
  createDeleteLoopItemButton,
  buildButtonGroup,
} from "./uiButtons.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { showConfirmModal } from "./modalSetup.js";

function renderFieldsWithLoops(container, fields, metaData) {
  const loopGroupKeys = new Set();
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      group.forEach((f) => loopGroupKeys.add(f.key));
      i = stopIdx + 1;

      const loopData = Array.isArray(metaData[loopKey])
        ? metaData[loopKey]
        : [{}];

      const loopContainer = document.createElement("div");
      loopContainer.className = "loop-container";
      loopContainer.dataset.loopKey = loopKey;

      // ─── Loop List (for Sortable) ─────
      const loopList = document.createElement("div");
      loopList.className = "loop-list";
      loopData.forEach((entry) => {
        const complete = { ...createLoopDefaults(group), ...entry };
        const itemWrapper = createLoopItem(group, complete);
        loopList.appendChild(itemWrapper);
      });

      loopContainer.appendChild(loopList);

      // ─── Add Button ─────
      const addButton = createAddLoopItemButton(() => {
        const newItem = createLoopItem(group, {});
        loopList.appendChild(newItem);
      });

      loopContainer.appendChild(addButton);
      container.appendChild(loopContainer);

      // ─── Enable Sortable ─────
      Sortable.create(loopList, {
        animation: 150,
        handle: ".drag-handle",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        group: "loop-items",
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 3,
        setPlaceholderSize: true,
        onStart: (evt) => {
          const original = evt.item;

          requestAnimationFrame(() => {
            const drag = document.querySelector(".sortable-drag");
            if (drag && original) {
              const style = getComputedStyle(original);
              drag.style.height = `${original.offsetHeight}px`;
              drag.style.width = `${original.offsetWidth}px`;
              drag.style.padding = style.padding;
              drag.style.margin = style.margin;
              drag.style.borderRadius = style.borderRadius;
              // force desired appearance
              drag.style.opacity = "0.95";
              drag.style.background = "var(--sortable-drag-bg, #ffe082)";
            }
          });
        },
      });
    } else {
      if (loopGroupKeys.has(field.key)) {
        i++;
        continue;
      }

      const row = renderFieldElement(field, metaData);
      if (row) container.appendChild(row);
      i++;
    }
  }
}

function createLoopItem(groupFields, dataEntry = {}) {
  const itemWrapper = document.createElement("div");
  itemWrapper.className = "loop-item";

  // ─── Drag Handle ─────
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  itemWrapper.appendChild(dragHandle);

  // ─── Remove Button ─────
  const firstField = groupFields[0];
  const firstKey = firstField?.key || "(unknown)";
  const label = firstField?.label || firstKey;

  const removeBtn = createDeleteLoopItemButton(async () => {
    const value = dataEntry[firstKey] || "(empty)";
    const confirmed = await showConfirmModal(
      `<div>Are you sure you want to remove this loop item?</div>
       <div class="modal-message-highlight"><strong>${label}</strong>: <em>${value}</em></div>`,
      {
        okText: "Delete",
        cancelText: "Cancel",
        width: "auto",
        height: "auto",
      }
    );
    if (confirmed) itemWrapper.remove();
  });

  itemWrapper.appendChild(removeBtn);

  // ─── Fields ─────
  groupFields.forEach((loopField) => {
    const fieldCopy = { ...loopField };
    const fieldKey = fieldCopy.key;

    if (!Object.prototype.hasOwnProperty.call(dataEntry, fieldKey)) {
      const defFn = fieldTypes[fieldCopy.type]?.defaultValue;
      dataEntry[fieldKey] = fieldCopy.hasOwnProperty("default")
        ? fieldCopy.default
        : typeof defFn === "function"
        ? defFn()
        : undefined;
    }

    const row = renderFieldElement(fieldCopy, {
      [fieldKey]: dataEntry[fieldKey],
    });
    if (row) itemWrapper.appendChild(row);
  });

  return itemWrapper;
}

function buildMetaSection(
  meta,
  filename,
  flaggedInitial = false,
  onFlagChange = null
) {
  const section = document.createElement("div");
  section.className = "meta-section";
  section.style.position = "relative"; // nodig voor absolute knop

  if (typeof onFlagChange === "function") {
    let flagged = flaggedInitial;

    const flaggedBtn = createFlaggedToggleButton(flagged, () => {
      flagged = !flagged;
      flaggedBtn.classList.toggle("btn-flagged", flagged);
      flaggedBtn.classList.toggle("btn-unflagged", !flagged);
      onFlagChange(flagged);
    });

    const flaggedContainer = document.createElement("div");
    flaggedContainer.className = "flagged-toggle-container";
    flaggedContainer.appendChild(flaggedBtn);

    // Eerst toevoegen (zodat knop boven tekst komt)
    section.appendChild(flaggedContainer);
  }

  // Meta info
  const p = document.createElement("p");
  p.style.whiteSpace = "pre-line";
  p.style.marginTop = "0"; // geen extra ruimte bovenaan
  p.textContent =
    `Filename: ${filename || ""}\n` +
    `Author: ${meta.author_name || ""}\n` +
    `Email: ${meta.author_email || ""}\n` +
    `Template: ${meta.template || ""}\n` +
    `Created: ${meta.created || ""}\n` +
    `Updated: ${meta.updated || ""}`;

  section.appendChild(p);

  return section;
}

export function renderFormUI(
  container,
  template,
  metaData,
  onSave,
  onDelete,
  onRender
) {
  container.innerHTML = "";

  // Hidden filename input (for saving)
  const filenameInput = buildHiddenInput(
    "meta-json-filename",
    metaData._filename || ""
  );
  container.appendChild(filenameInput);

  // Hidden flagged input (for saving)
  const flaggedInput = buildHiddenInput(
    "meta-flagged",
    metaData.meta?.flagged ? "true" : "false"
  );
  container.appendChild(flaggedInput);

  // Meta info section with flagged toggle, updating hidden input on change
  const metaSection = buildMetaSection(
    metaData.meta || {},
    metaData._filename || "",
    metaData.meta?.flagged || false,
    (newFlagged) => {
      flaggedInput.value = newFlagged ? "true" : "false";
    }
  );
  container.appendChild(metaSection);

  // Fields
  const fields = template.fields || [];
  injectFieldDefaults(fields, metaData);

  renderFieldsWithLoops(container, fields, metaData);

  // Buttons
  const saveBtn = createFormSaveButton(onSave);
  const deleteBtn = createFormDeleteButton(() => onDelete(metaData._filename));
  const renderBtn = createFormRenderButton(onRender);

  container.appendChild(buildButtonGroup(saveBtn, deleteBtn, renderBtn));
  applyFieldValues(container, template, metaData);
  focusFirstInput(container);
}
