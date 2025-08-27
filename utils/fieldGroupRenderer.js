// utils/fieldGroupRenderer.js

import { addContainerElement } from "./elementBuilders.js";
import { collectLoopGroup, createLoopDefaults } from "./formUtils.js";
import { applyValueToField, createSortable } from "./domUtils.js";
import {
  createAddLoopItemButton,
  createDeleteLoopItemButton,
} from "../modules/uiButtons.js";
import { showConfirmModal } from "./modalUtils.js";
import { fieldTypes } from "./fieldTypes.js";
import { t } from "./i18n.js";

async function renderFieldElement(
  field,
  value = "",
  template = null,
  options = {}
) {
  const type = field.type;
  const typeDef = fieldTypes[type];

  if (!typeDef || typeof typeDef.renderInput !== "function") {
    EventBus.emit("logging:default", [
      `[renderFieldElement] No renderInput defined for field type: ${type}`,
    ]);
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(field, "default")) {
    field.default = typeDef.defaultValue();
  }

  return await typeDef.renderInput(field, value, template, options);
}

export async function fieldGroupRenderer(
  container,
  fields,
  metaData,
  template,
  eventFunctions = {},
  loopKeyChain = []
) {
  const loopGroupKeys = new Set();
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      group.forEach((f) => loopGroupKeys.add(f.key));
      i = stopIdx + 1;

      const nestingDepth = loopKeyChain.length || 0;
      const loopData = Array.isArray(metaData[loopKey])
        ? metaData[loopKey]
        : [{}];

      const loopContainer = document.createElement("div");
      loopContainer.className = "loop-container";
      loopContainer.dataset.loopKey = loopKey;

      addContainerElement({
        parent: loopContainer,
        tag: "div",
        className: "loop-label",
        textContent: field.label || "Unnamed Loop",
      });

      if (field.description) {
        addContainerElement({
          parent: loopContainer,
          tag: "div",
          className: "loop-description",
          textContent: field.description,
        });
      }

      const loopList = document.createElement("div");
      loopList.className = "loop-list";

      for (const entry of loopData) {
        const complete = { ...createLoopDefaults(group), ...entry };
        const itemWrapper = await createLoopItem(
          group,
          complete,
          template,
          eventFunctions,
          [...loopKeyChain, loopKey],
          field,
          metaData
        );
        loopList.appendChild(itemWrapper);
      }

      const addButton = createAddLoopItemButton(async () => {
        const newItem = await createLoopItem(
          group,
          {},
          template,
          eventFunctions,
          [...loopKeyChain, loopKey],
          field,
          metaData
        );
        loopList.appendChild(newItem);
      });

      loopContainer.appendChild(loopList);
      loopContainer.appendChild(addButton);
      container.appendChild(loopContainer);

      createSortable(loopList, {
        handle: `.loop-handle.depth-${nestingDepth + 1}`,
        group: `loop-${loopKey}`,
        itemSelector: ".loop-item"
      });
    } else {
      if (loopGroupKeys.has(field.key)) {
        i++;
        continue;
      }

      const row = await renderFieldElement(
        field,
        metaData[field.key],
        template,
        eventFunctions
      );
      if (row) {
        container.appendChild(row);
        await applyValueToField(
          container,
          field,
          metaData[field.key],
          template,
          eventFunctions
        );
      }
      i++;
    }
  }
}

function getLoopSummaryField(loopStartField, groupFields, dataEntry = {}) {
  const summaryKey = loopStartField?.summary_field;
  const summaryField = summaryKey
    ? groupFields.find((f) => f.key === summaryKey)
    : groupFields.find(
        (f) => f.key && f.type !== "loopstart" && f.type !== "loopstop"
      );

  const key = summaryField?.key || "(unknown)";
  const label = summaryField?.label || key;
  const value = dataEntry?.[key] || "(empty)";

  return { key, label, value };
}

async function createLoopItem(
  groupFields,
  dataEntry = {},
  template,
  eventFunctions = {},
  loopKeyChain = [],
  loopStartField = null,
  metaData = {}
) {
  const itemWrapper = document.createElement("div");
  itemWrapper.className = "loop-item";

  // ─── Header Row ───
  const header = document.createElement("div");
  header.className = "loop-item-header";

  // Drag handle
  const nestingDepth = loopKeyChain.length || 0;
  const dragClass = `drag-handle loop-handle depth-${nestingDepth}`;

  const dragHandle = document.createElement("div");
  dragHandle.className = dragClass;
  dragHandle.textContent = "⠿";
  header.appendChild(dragHandle);

  // Collapse toggle
  const collapseBtn = document.createElement("button");
  collapseBtn.className = "collapse-toggle";
  collapseBtn.innerHTML = "▼";
  collapseBtn.addEventListener("click", () => {
    const isCollapsed = itemWrapper.classList.toggle("collapsed");
    collapseBtn.innerHTML = isCollapsed ? "▶" : "▼";
  });
  header.appendChild(collapseBtn);

  const {
    key: previewKey,
    label: previewLabel,
    value: previewValue,
  } = getLoopSummaryField(loopStartField, groupFields, dataEntry);

  // Remove button
  const removeBtn = createDeleteLoopItemButton(async () => {
    const confirmed = await showConfirmModal(
      "special.loop.delete.sure",
      `<div class="modal-message-highlight"><strong>${previewLabel}</strong>: <em>${previewValue}</em></div>`,
      {
        okKey: "standard.delete",
        cancelKey: "standard.cancel",
        width: "auto",
        height: "auto",
      }
    );
    if (confirmed) {
      itemWrapper.remove();
    }
  });

  header.appendChild(removeBtn);

  // ─── Summary Line (Shown When Collapsed) ───
  if (loopStartField?.summary_field) {
    const summaryEl = document.createElement("div");
    summaryEl.className = "loop-item-summary";

    const firstLine = (previewValue || "").split("\n")[0].trim() || "(empty)";
    summaryEl.textContent = firstLine;
    header.appendChild(summaryEl);

    setTimeout(() => {
      const fieldSelector = `[name="${previewKey}"]`;
      const inputEl = itemWrapper.querySelector(fieldSelector);
      if (inputEl) {
        const updateSummary = () => {
          const raw = inputEl.value || "";
          const firstLine = raw.split("\n")[0].trim() || "(empty)";
          summaryEl.textContent = firstLine;
        };
        inputEl.addEventListener("input", updateSummary);
        updateSummary();
      }
    }, 50);
  }

  itemWrapper.appendChild(header);

  // ─── Loop Fields Container ───
  const fieldsContainer = document.createElement("div");
  fieldsContainer.className = "loop-fields";

  // ─── Iterate through fields ───
  let i = 0;
  while (i < groupFields.length) {
    const field = groupFields[i];

    if (field.type === "loopstart") {
      // ───── Nested Loop ─────
      const nestedKey = field.key;
      const { group: nestedGroup, stopIdx } = collectLoopGroup(
        groupFields,
        i + 1,
        nestedKey
      );
      i = stopIdx + 1;

      const nestedLoopKeyChain = [...loopKeyChain, nestedKey];
      const nestedLoopData = Array.isArray(dataEntry[nestedKey])
        ? dataEntry[nestedKey]
        : [{}];

      const nestedContainer = document.createElement("div");
      nestedContainer.className = `loop-container${
        nestedLoopKeyChain.length > 1 ? " sub-loop-container" : ""
      }`;
      nestedContainer.dataset.loopKey = nestedKey;
      nestedContainer.dataset.loopDepth = nestedLoopKeyChain.length;

      addContainerElement({
        parent: nestedContainer,
        tag: "div",
        className: "loop-label",
        textContent: field.label || "(Unnamed Loop)",
      });

      if (field.description) {
        addContainerElement({
          parent: nestedContainer,
          tag: "div",
          className: "loop-description",
          textContent: field.description,
        });
      }

      const nestedList = document.createElement("div");
      nestedList.className = "loop-list";

      const nestedDepth = nestedLoopKeyChain.length || 0;

      for (const entry of nestedLoopData) {
        const complete = { ...createLoopDefaults(nestedGroup), ...entry };
        const nestedItem = await createLoopItem(
          nestedGroup,
          complete,
          template,
          eventFunctions,
          nestedLoopKeyChain,
          field,
          metaData
        );
        nestedList.appendChild(nestedItem);
      }

      createSortable(nestedList, {
        handle: `.drag-handle.depth-${nestedDepth}`,
        group: `loop-${nestedKey}`,
        itemSelector: ".loop-item"
      });

      const addNestedButton = createAddLoopItemButton(async () => {
        const newItem = await createLoopItem(
          nestedGroup,
          {},
          template,
          eventFunctions,
          nestedLoopKeyChain,
          field,
          metaData
        );
        nestedList.appendChild(newItem);
      });

      nestedContainer.appendChild(nestedList);
      nestedContainer.appendChild(addNestedButton);
      fieldsContainer.appendChild(nestedContainer);
    } else {
      // ───── Regular Field ─────
      const fieldKey = field.key;
      const fieldCopy = {
        ...field,
        loopKey: loopKeyChain,
      };

      if (!Object.prototype.hasOwnProperty.call(dataEntry, fieldKey)) {
        const defFn = fieldTypes[fieldCopy.type]?.defaultValue;
        dataEntry[fieldKey] = fieldCopy.hasOwnProperty("default")
          ? fieldCopy.default
          : typeof defFn === "function"
          ? defFn()
          : undefined;
      }

      const row = await renderFieldElement(
        fieldCopy,
        dataEntry[fieldKey],
        template,
        eventFunctions
      );
      if (row) {
        fieldsContainer.appendChild(row);
        await applyValueToField(
          fieldsContainer,
          fieldCopy,
          dataEntry[fieldKey],
          template,
          eventFunctions
        );
      }
      i++;
    }
  }

  itemWrapper.appendChild(fieldsContainer);
  return itemWrapper;
}
