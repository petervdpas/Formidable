// utils/fieldGroupRenderer.js

import { addContainerElement } from "./elementBuilders.js";
import { collectLoopGroup, createLoopDefaults } from "./formUtils.js";
import { applyValueToField, createSortable } from "./domUtils.js";
import {
  createAddLoopItemButton,
  createDeleteLoopItemButton,
  createLoopToolbar,
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
  const cfg = await new Promise((resolve) => {
    EventBus.emit("config:load", (c) => resolve(c || {}));
  });
  const defaultCollapsed =
    (cfg.loop_collapse_state ?? cfg.loop_state_collapsed) === true;

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
          metaData,
          { defaultCollapsed }
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
          metaData,
          { defaultCollapsed }
        );
        loopList.appendChild(newItem);
      });

      const loopToolbar = createLoopToolbar(loopList);
      loopContainer.classList.add("has-toolbar");

      loopContainer.appendChild(loopToolbar);
      loopContainer.appendChild(loopList);
      loopContainer.appendChild(addButton);

      container.appendChild(loopContainer);

      createSortable(loopList, {
        handle: `.loop-handle.depth-${nestingDepth + 1}`,
        group: `loop-${loopKey}`,
        itemSelector: ".loop-item",
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
        if (field.type === "link" && row.classList) {
          row.classList.add("link-row");
          row.dataset.linkRowFor = field.key;
        }

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

export function getLoopSummaryField(
  loopStartField,
  groupFields,
  dataEntry = {}
) {
  const summaryKey = loopStartField?.summary_field;
  const summaryField = summaryKey
    ? groupFields.find((f) => f.key === summaryKey)
    : groupFields.find(
        (f) => f.key && f.type !== "loopstart" && f.type !== "loopstop"
      );

  const key = summaryField?.key ?? "(unknown)";
  const label = summaryField?.label ?? key;
  const raw = dataEntry?.[key];

  if (summaryField?.type === "link") {
    let o = raw;
    if (typeof o === "string") {
      try {
        o = JSON.parse(o);
      } catch {
        o = { href: o, text: "" };
      }
    }
    if (o && typeof o === "object") {
      const txt = (o.text ?? "").trim();
      if (txt) return { key, label, value: txt, _type: "link" };
      const href = (o.href ?? "").trim();
      if (!href) return { key, label, value: "(empty)" };
      if (href.startsWith("formidable://")) {
        const entry = href.slice("formidable://".length).split(":").pop() || "";
        return {
          key,
          label,
          value: entry.replace(/\.meta\.json$/i, "") || href,
          _type: "link",
        };
      }
      const last = href.split("/").filter(Boolean).pop() || href;
      return { key, label, value: last, _type: "link" };
    }
    return { key, label, value: "(empty)", _type: "link" };
  }

  if (raw == null || raw === "")
    return { key, label, value: "(empty)", _type: summaryField?.type };
  return {
    key,
    label,
    value: Array.isArray(raw) ? raw[0] ?? "(empty)" : String(raw),
    _type: summaryField?.type,
  };
}

async function createLoopItem(
  groupFields,
  dataEntry = {},
  template,
  eventFunctions = {},
  loopKeyChain = [],
  loopStartField = null,
  metaData = {},
  opts = {}
) {
  const { defaultCollapsed = false } = opts;

  const itemWrapper = document.createElement("div");
  itemWrapper.className = "loop-item";

  // ─── Header Row ───
  const header = document.createElement("div");
  header.className = "loop-item-header";

  // Drag handle
  const nestingDepth = loopKeyChain.length || 0;
  const dragHandle = document.createElement("div");
  dragHandle.className = `drag-handle loop-handle depth-${nestingDepth}`;
  dragHandle.textContent = "⠿";
  header.appendChild(dragHandle);

  // Collapse toggle
  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.className = "collapse-toggle";
  collapseBtn.innerHTML = "▼";
  collapseBtn.setAttribute("aria-expanded", "true");
  collapseBtn.setAttribute("title", t("standard.collapse") || "Collapse");
  collapseBtn.addEventListener("click", () => {
    const isCollapsed = itemWrapper.classList.toggle("collapsed");
    collapseBtn.innerHTML = isCollapsed ? "▶" : "▼";
    collapseBtn.setAttribute("aria-expanded", String(!isCollapsed));
    collapseBtn.setAttribute(
      "title",
      isCollapsed
        ? t("standard.expand") || "Expand"
        : t("standard.collapse") || "Collapse"
    );
  });
  header.appendChild(collapseBtn);

  // Preview/summary source
  const {
    key: previewKey,
    label: previewLabel,
    value: previewValue,
    _type: previewType,
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
    if (confirmed) itemWrapper.remove();
  });
  header.appendChild(removeBtn);

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
          metaData,
          { defaultCollapsed }
        );
        nestedList.appendChild(nestedItem);
      }

      createSortable(nestedList, {
        handle: `.drag-handle.depth-${nestedDepth}`,
        group: `loop-${nestedKey}`,
        itemSelector: ".loop-item",
      });

      const addNestedButton = createAddLoopItemButton(async () => {
        const newItem = await createLoopItem(
          nestedGroup,
          {},
          template,
          eventFunctions,
          nestedLoopKeyChain,
          field,
          metaData,
          { defaultCollapsed }
        );
        nestedList.appendChild(newItem);
      });

      const nestedToolbar = createLoopToolbar(nestedList);
      nestedContainer.classList.add("has-toolbar");

      nestedContainer.appendChild(nestedToolbar);
      nestedContainer.appendChild(nestedList);
      nestedContainer.appendChild(addNestedButton);

      fieldsContainer.appendChild(nestedContainer);
    } else {
      // ───── Regular Field ─────
      const fieldKey = field.key;
      const fieldCopy = { ...field, loopKey: loopKeyChain };

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
        if (fieldCopy.type === "link" && row.classList) {
          row.classList.add("link-row");
          row.dataset.linkRowFor = fieldCopy.key;
        }
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

  // ─── Summary Line (Shown When Collapsed) ───
  if (loopStartField?.summary_field) {
    const summaryEl = document.createElement("div");
    summaryEl.className = "loop-item-summary";
    const firstLine = (previewValue || "").split("\n")[0].trim() || "(empty)";
    summaryEl.textContent = firstLine;
    header.appendChild(summaryEl);

    // Inputs are now in DOM; wire live updates
    const fieldSelector = `[name="${previewKey}"]`;
    const inputEl = itemWrapper.querySelector(fieldSelector);
    if (inputEl) {
      const isLink = previewType === "link";
      const updateSummary = () => {
        const raw = (inputEl.value || "").trim();
        let display = "(empty)";

        if (isLink) {
          let obj = null;
          if (raw) {
            try {
              obj = JSON.parse(raw);
            } catch {
              obj = { href: raw, text: "" };
            }
          }
          if (obj) {
            const txt = (obj.text ?? "").trim();
            const href = (obj.href ?? "").trim();
            if (txt) display = txt;
            else if (href) {
              if (href.startsWith("formidable://")) {
                const rest = href.slice("formidable://".length);
                const entry = rest.split(":").pop() ?? "";
                display = entry.replace(/\.meta\.json$/i, "") || href;
              } else {
                display = href.split("/").filter(Boolean).pop() || href;
              }
            }
          }
        } else {
          display = raw.split("\n")[0].trim() || "(empty)";
        }

        summaryEl.textContent = display;
      };
      inputEl.addEventListener("input", updateSummary);
      inputEl.addEventListener("change", updateSummary);
      updateSummary();
    }
  }

  // ─── Initial collapsed state (per-loop override > global) ───
  const initCollapsed =
    loopStartField?.collapsed === true ? true : defaultCollapsed;
  if (initCollapsed) {
    itemWrapper.classList.add("collapsed");
    collapseBtn.innerHTML = "▶";
    collapseBtn.setAttribute("aria-expanded", "false");
    collapseBtn.setAttribute("title", t("standard.expand") || "Expand");
  }

  return itemWrapper;
}
