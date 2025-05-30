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
  buildButtonGroup,
} from "./uiButtons.js";
import { fieldTypes } from "../utils/fieldTypes.js";

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

      const addButton = document.createElement("button");
      addButton.textContent = "+ Add Item";
      addButton.onclick = () => {
        const newItem = createLoopItem(group, {});
        loopContainer.insertBefore(newItem, addButton);
      };

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

  groupFields.forEach((loopField) => {
    const fieldCopy = { ...loopField };
    const fieldKey = fieldCopy.key;

    // Vul alleen aan als de key ontbreekt — géén default overschrijven!
    if (!Object.prototype.hasOwnProperty.call(dataEntry, fieldKey)) {
      const defFn = fieldTypes[fieldCopy.type]?.defaultValue;
      dataEntry[fieldKey] = fieldCopy.hasOwnProperty("default")
        ? fieldCopy.default
        : typeof defFn === "function"
        ? defFn()
        : undefined;
    }

    // Pas volledige entry toe (met expliciete en fallback waarden)
    const row = renderFieldElement(fieldCopy, {
      [fieldKey]: dataEntry[fieldKey],
    });
    if (row) itemWrapper.appendChild(row);
  });

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "−";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = () => itemWrapper.remove();
  itemWrapper.appendChild(removeBtn);

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
