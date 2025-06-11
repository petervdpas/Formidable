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

async function renderFieldsWithLoops(container, fields, metaData) {
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

      const loopList = document.createElement("div");
      loopList.className = "loop-list";

      for (const entry of loopData) {
        const complete = { ...createLoopDefaults(group), ...entry };
        const itemWrapper = await createLoopItem(group, complete);
        loopList.appendChild(itemWrapper);
      }

      loopContainer.appendChild(loopList);

      const addButton = createAddLoopItemButton(async () => {
        const newItem = await createLoopItem(group, {});
        loopList.appendChild(newItem);
      });

      loopContainer.appendChild(addButton);
      container.appendChild(loopContainer);

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

      const row = await renderFieldElement(field, metaData);
      if (row) container.appendChild(row);
      i++;
    }
  }
}

async function createLoopItem(groupFields, dataEntry = {}) {
  const itemWrapper = document.createElement("div");
  itemWrapper.className = "loop-item";

  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "⠿";
  itemWrapper.appendChild(dragHandle);

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

  for (const loopField of groupFields) {
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

    const row = await renderFieldElement(fieldCopy, {
      [fieldKey]: dataEntry[fieldKey],
    });
    if (row) itemWrapper.appendChild(row);
  }

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
  section.style.position = "relative";

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
    section.appendChild(flaggedContainer);
  }

  const p = document.createElement("p");
  p.style.whiteSpace = "pre-line";
  p.style.marginTop = "0";
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

export async function renderFormUI(
  container,
  template,
  metaData,
  onSave,
  onDelete,
  onRender
) {
  container.innerHTML = "";

  const filenameInput = buildHiddenInput(
    "meta-json-filename",
    metaData._filename || ""
  );
  container.appendChild(filenameInput);

  const flaggedInput = buildHiddenInput(
    "meta-flagged",
    metaData.meta?.flagged ? "true" : "false"
  );
  container.appendChild(flaggedInput);

  const metaSection = buildMetaSection(
    metaData.meta || {},
    metaData._filename || "",
    metaData.meta?.flagged || false,
    (newFlagged) => {
      flaggedInput.value = newFlagged ? "true" : "false";
    }
  );
  container.appendChild(metaSection);

  const fields = template.fields || [];
  injectFieldDefaults(fields, metaData);

  await renderFieldsWithLoops(container, fields, metaData);

  const saveBtn = createFormSaveButton(onSave);
  const deleteBtn = createFormDeleteButton(() => onDelete(metaData._filename));
  const renderBtn = createFormRenderButton(onRender);

  container.appendChild(buildButtonGroup(saveBtn, deleteBtn, renderBtn));
  applyFieldValues(container, template, metaData);
  focusFirstInput(container);
}
