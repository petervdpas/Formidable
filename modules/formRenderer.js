// modules/formRenderer.js

import { buildReadOnlyInput } from "../utils/elementBuilders.js";
import {
  renderFieldElement,
  injectFieldDefaults,
  collectLoopGroup,
  createLoopDefaults,
} from "../utils/formUtils.js";
import { applyFieldValues, focusFirstInput } from "../utils/domUtils.js";
import {
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

      loopData.forEach((entry) => {
        const complete = { ...createLoopDefaults(group), ...entry };
        const itemWrapper = createLoopItem(group, complete);
        loopContainer.appendChild(itemWrapper);
      });

      const addButton = createAddLoopItemButton(() => {
        const newItem = createLoopItem(group, {});
        loopContainer.insertBefore(newItem, addButton);
      });

      loopContainer.appendChild(addButton);
      container.appendChild(loopContainer);
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

export function renderFormUI(
  container,
  template,
  metaData,
  onSave,
  onDelete,
  onRender
) {
  container.innerHTML = "";

  // Filename field
  const filenameRow = buildReadOnlyInput(
    "meta-json-filename",
    "readonly-input",
    "Filename",
    metaData._filename || ""
  );
  container.appendChild(filenameRow);

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
