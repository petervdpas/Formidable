// utils/fieldGroupRenderer.js

import { addContainerElement } from "./elementBuilders.js";
import { collectLoopGroup, createLoopDefaults } from "./formUtils.js";
import {
  createAddLoopItemButton,
  createDeleteLoopItemButton,
} from "../modules/uiButtons.js";
import { showConfirmModal } from "./modalUtils.js";
import { fieldTypes } from "./fieldTypes.js";

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
  eventFunctions = {}
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

      const loopList = document.createElement("div");
      loopList.className = "loop-list";

      for (const entry of loopData) {
        const complete = { ...createLoopDefaults(group), ...entry };
        const itemWrapper = await createLoopItem(
          group,
          complete,
          template,
          eventFunctions,
          [loopKey]
        );
        loopList.appendChild(itemWrapper);
      }

      const addButton = createAddLoopItemButton(
        async () => {
          const newItem = await createLoopItem(
            group,
            {},
            template,
            eventFunctions,
            [loopKey]
          );
          loopList.appendChild(newItem);
        }
      );

      loopContainer.appendChild(loopList);
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

      const row = await renderFieldElement(
        field,
        metaData[field.key],
        template,
        eventFunctions
      );
      if (row) container.appendChild(row);
      i++;
    }
  }
}

async function createLoopItem(
  groupFields,
  dataEntry = {},
  template,
  eventFunctions = {},
  loopKeyChain = []
) {
  const itemWrapper = document.createElement("div");
  itemWrapper.className = "loop-item";

  // Drag handle
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "⠿";
  itemWrapper.appendChild(dragHandle);

  // Remove button with confirmation
  const firstField = groupFields[0];
  const firstKey = firstField?.key || "(unknown)";
  const label = firstField?.label || firstKey;

  const removeBtn = createDeleteLoopItemButton(async () => {
    const value = dataEntry[firstKey] || "(empty)";
    const confirmed = await showConfirmModal(
      `<div>Are you sure you want to remove this loop item?</div>
       <div class="modal-message-highlight"><strong>${label}</strong>: <em>${value}</em></div>`,
      { okText: "Delete", cancelText: "Cancel", width: "auto", height: "auto" }
    );
    if (confirmed) itemWrapper.remove();
  });

  itemWrapper.appendChild(removeBtn);

  // Iterate through all fields in the group
  let i = 0;
  while (i < groupFields.length) {
    const field = groupFields[i];

    if (field.type === "loopstart") {
      // ───── Nested Loop Detected ─────
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

      const label = document.createElement("div");
      label.className = "loop-label";
      label.textContent = field.label || "(Unnamed Loop)";
      nestedContainer.appendChild(label);

      const nestedList = document.createElement("div");
      nestedList.className = "loop-list";

      for (const entry of nestedLoopData) {
        const complete = { ...createLoopDefaults(nestedGroup), ...entry };
        const nestedItem = await createLoopItem(
          nestedGroup,
          complete,
          template,
          eventFunctions,
          nestedLoopKeyChain
        );
        nestedList.appendChild(nestedItem);
      }

      const addNestedButton = createAddLoopItemButton(
        async () => {
          const newItem = await createLoopItem(
            nestedGroup,
            {},
            template,
            eventFunctions,
            nestedLoopKeyChain
          );
          nestedList.appendChild(newItem);
        }
      );

      nestedContainer.appendChild(nestedList);
      nestedContainer.appendChild(addNestedButton);
      itemWrapper.appendChild(nestedContainer);
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
      if (row) itemWrapper.appendChild(row);
      i++;
    }
  }

  return itemWrapper;
}
