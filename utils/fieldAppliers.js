// utils/fieldAppliers.js

import { EventBus } from "../modules/eventBus.js";
import { createLinkOpenButton } from "../modules/uiButtons.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { showOptionPopup } from "./popupUtils.js";
import { createSortable } from "./domUtils.js";

export function applyGuidField(container, field, value) {
  const key = field.key;
  const input = container.querySelector(
    `input[type="hidden"][data-guid-field="${key}"]`
  );
  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGuidField] Missing input for "${key}"`,
    ]);
    return;
  }
  input.value = value != null ? String(value) : "";
}

export function applyRangeField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;
  const rangeWrapper = container.querySelector(`[data-range-field="${key}"]`);
  if (!rangeWrapper) return;

  const input = rangeWrapper.querySelector(
    `input[type="range"][name="${key}"]`
  );
  const display = rangeWrapper.querySelector(".range-display");

  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyRangeField] Input not found for key "${key}".`,
    ]);
    return;
  }

  // Safely coerce to float
  const val = parseFloat(value);
  if (!isFinite(val)) {
    EventBus.emit("logging:warning", [
      `[applyRangeField] Invalid value: ${value} for key "${key}".`,
    ]);
    return;
  }

  // Optional: parse and apply min/max/step if present in options
  const optMap = Object.fromEntries(
    (field.options || []).map((pair) =>
      Array.isArray(pair) ? pair : [pair, pair]
    )
  );

  if ("min" in optMap) input.min = String(optMap.min);
  if ("max" in optMap) input.max = String(optMap.max);
  if ("step" in optMap) input.step = String(optMap.step);

  input.value = String(val);
  if (display) display.textContent = String(val);
}

export function applyListField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;
  const options = field.options || [];

  const listWrapper = container.querySelector(`[data-list-field="${key}"]`);
  if (!listWrapper) return;

  const sortableList = listWrapper.querySelector(".sortable-list");
  const addButton = listWrapper.querySelector("button.add-list-button");
  const scope = sortableList?.dataset?.dndScope || listWrapper?.dataset?.dndScope || `list:${key}:global`;

  if (!sortableList || !addButton) {
    EventBus.emit("logging:error", [
      `[applyListField] Could not find sortable-list or add button for key "${key}".`,
    ]);
    return;
  }

  // Remove existing items
  const existingItems = sortableList.querySelectorAll(".list-field-item");
  existingItems.forEach((item) => item.remove());

  // Add new ones from value
  (value || []).forEach((item) => {
    const itemWrapper = document.createElement("div");
    itemWrapper.className = "list-field-item";

    // Drag handle
    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle list-handle";
    dragHandle.textContent = "☰";
    dragHandle.style.cursor = "grab";
    itemWrapper.appendChild(dragHandle);

    // Input
    const input = document.createElement("input");
    input.type = "text";
    input.name = "list-item";
    input.className = "list-input";
    input.value = item;

    if (options.length > 0) {
      input.readOnly = true;
      input.onclick = () => showOptionPopup(input, options);

      const isValid = options.some((opt) =>
        typeof opt === "string" ? opt === item : opt.value === item
      );

      if (!isValid && item) {
        input.classList.add("invalid-option");
        input.placeholder = "⚠ Not in list";
        input.title = "This value is not in the allowed options";
      }
    }

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "-";
    removeBtn.onclick = () => itemWrapper.remove();

    itemWrapper.appendChild(input);
    itemWrapper.appendChild(removeBtn);

    sortableList.appendChild(itemWrapper);
  });

  createSortable(sortableList, {
    handle: ".list-handle",
    group: { name: scope, pull: true, put: true },
    allowDrag: true,
    itemSelector: ".list-field-item",
    innerGuard: true,
  });
}

export function applyTableField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;

  const tableWrapper = container.querySelector(`[data-table-field="${key}"]`);
  if (!tableWrapper || !Array.isArray(value)) return;

  const tbody = tableWrapper.querySelector("tbody");
  const scope = tbody?.dataset?.dndScope || tableWrapper?.dataset?.dndScope || `table:${key}:global`;
  tbody.innerHTML = "";

  value.forEach((row) => {
    const tr = document.createElement("tr");

    // Optional: add a drag handle in the first cell
    const handleCell = document.createElement("td");
    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle row-handle";
    dragHandle.textContent = "☰";
    dragHandle.style = "cursor: grab;";
    handleCell.appendChild(dragHandle);
    tr.appendChild(handleCell);

    // Add data columns
    row.forEach((cellValue) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = cellValue;
      td.appendChild(input);
      tr.appendChild(td);
    });

    // Add remove button cell
    const tdRemove = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => tr.remove();
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });

  // Enable drag-to-reorder on table rows
  createSortable(tbody, {
    handle: ".row-handle",
    group: { name: scope, pull: true, put: true },
    allowDrag: true,
    itemSelector: "tr",
    innerGuard: true,
  });
}

export function applyMultioptionField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;
  const wrapper = container.querySelector(`[data-multioption-field="${key}"]`);
  if (!wrapper || !Array.isArray(value)) return;

  const checkboxes = wrapper.querySelectorAll(`input[type="checkbox"]`);
  checkboxes.forEach((cb) => {
    cb.checked = value.includes(cb.value);
  });
}

export function applyImageField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;
  ensureVirtualLocation(template).then((resolvedTemplate) => {
    applyImageLogic(container, key, value, resolvedTemplate);
  });
}

function applyImageLogic(container, key, value, template) {
  const wrapper = container.querySelector(`[data-image-field="${key}"]`);
  const preview = wrapper?.querySelector("img");

  if (!wrapper || !preview) {
    EventBus.emit("logging:warning", [
      `[applyImageField] Missing wrapper or image element for key "${key}"`,
    ]);
    return;
  }

  if (typeof value === "string" && value.startsWith("data:image")) {
    preview.src = value;
    wrapper.setAttribute("data-filename", ""); // or some hash
    const btn = wrapper.querySelector(".btn-remove-image");
    if (btn) btn.style.display = "inline-block";
    return;
  }

  if (!template?.virtualLocation || !value) return;

  window.api.system
    .resolvePath(template.virtualLocation, "images", value)
    .then((imgPath) => {
      preview.src = `file://${imgPath.replace(/\\/g, "/")}`;
      wrapper.setAttribute("data-filename", value);
      const btn = wrapper.querySelector(".btn-remove-image");
      if (btn) btn.style.display = "inline-block";
    })
    .catch((err) => {
      EventBus.emit("logging:error", [
        `[applyImageField] Failed to resolve image path: ${value}`,
        err,
      ]);
    });
}

export async function applyLinkField(
  container,
  field,
  value,
  template,
  eventFunctions = {}
) {
  const key = field.key;
  const wrapper = container.querySelector(`[data-link-field="${key}"]`);
  if (!wrapper) return;

  const formatSelect = wrapper.querySelector("select");
  const templateSelect = wrapper.querySelector("select:nth-of-type(2)");
  const entrySelect = wrapper.querySelector("select:nth-of-type(3)");
  const urlInput = wrapper.querySelector('input[type="text"]');

  const fetchTemplates =
    eventFunctions.fetchTemplates || (() => Promise.resolve([]));
  const fetchMetaFiles =
    eventFunctions.fetchMetaFiles || (() => Promise.resolve([]));

  // Ensure only 1 button container instance
  let buttonContainer = wrapper.nextElementSibling;
  let actionButton = null;

  if (
    !buttonContainer ||
    !buttonContainer.classList.contains("link-action-container")
  ) {
    buttonContainer = document.createElement("div");
    buttonContainer.className = "link-action-container";
    buttonContainer.style.marginTop = "0.4em";

    function onLinkClick() {
      const href = actionButton?.dataset.href || "";
      if (href.startsWith("formidable://")) {
        const tpl = templateSelect.value;
        const entry = entrySelect.value;
        EventBus.emit("link:formidable:navigate", {
          link: href,
          template: tpl,
          entry,
        });
      } else if (href.startsWith("http://") || href.startsWith("https://")) {
        EventBus.emit("link:external:open", href);
      } else {
        EventBus.emit("logging:warning", [
          "[applyLinkField] Unknown link format:",
          href,
        ]);
      }
    }

    actionButton = createLinkOpenButton(value || "(no link)", onLinkClick);
    buttonContainer.appendChild(actionButton);

    // INSERT AFTER wrapper (outside flex row)
    wrapper.parentElement.insertBefore(buttonContainer, wrapper.nextSibling);
  } else {
    actionButton = buttonContainer.querySelector("#btn-link-open");
  }

  function updateHref(href) {
    actionButton.dataset.href = href;
    actionButton.textContent = href || "(no link)";
    actionButton.disabled = !href || href.trim() === "";
  }

  if (typeof value !== "string" || value.trim() === "") {
    formatSelect.value = "regular";
    urlInput.value = "";
    urlInput.style.display = "block";
    templateSelect.style.display = "none";
    entrySelect.style.display = "none";
    updateHref("");
    return;
  }

  if (value.startsWith("formidable://")) {
    formatSelect.value = "formidable";

    const parts = value.replace("formidable://", "").split(":");
    const tpl = parts[0];
    const entry = parts[1] || "";

    const templates = await fetchTemplates();
    templateSelect.innerHTML = "";
    templates.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.filename;
      o.textContent = t.filename;
      templateSelect.appendChild(o);
    });
    templateSelect.value = tpl;

    const metaFiles = await fetchMetaFiles(tpl);
    entrySelect.innerHTML = "";
    metaFiles.forEach((file) => {
      const o = document.createElement("option");
      o.value = file;
      o.textContent = file;
      entrySelect.appendChild(o);
    });
    entrySelect.value = entry;

    templateSelect.style.display = "inline-block";
    entrySelect.style.display = "inline-block";
    urlInput.style.display = "none";

    updateHref(`formidable://${tpl}:${entry}`);
  } else {
    formatSelect.value = "regular";
    urlInput.value = value;
    urlInput.style.display = "block";
    templateSelect.style.display = "none";
    entrySelect.style.display = "none";

    updateHref(value);
  }
}

export function applyTagsField(container, field, value) {
  const key = field.key;
  const wrapper = container.querySelector(`[data-tags-field="${key}"]`);
  if (!wrapper || !Array.isArray(value)) return;

  const inputGroup = wrapper.querySelector(".tags-input-group");
  if (!inputGroup) {
    EventBus.emit("logging:warning", [
      `[applyTagsField] Missing input group for key "${key}".`,
    ]);
    return;
  }

  // Remove existing tag inputs
  inputGroup.innerHTML = "";

  // Recreate each tag input
  value.forEach((tag) => {
    const div = document.createElement("div");
    div.className = "tag-input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.name = field.key;
    input.className = "tag-input";
    input.value = tag;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "-";
    removeBtn.className = "remove-tag-btn";
    removeBtn.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(removeBtn);
    inputGroup.appendChild(div);
  });
}

export function applyGenericField(container, field, value) {
  const key = field.key;
  const input = container.querySelector(`[name="${key}"]`);

  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGenericField] Missing input for key "${key}".`,
    ]);
    return;
  }

  if (input.dataset?.radioGroup === key) {
    const radios = input.querySelectorAll(`input[type="radio"]`);
    radios.forEach((el) => {
      el.checked = String(el.value) === String(value);
    });
    return;
  }

  if (input.type === "checkbox") {
    input.checked = value === true;
    return;
  }

  if ("value" in input) {
    input.value = value != null ? String(value) : "";
    return;
  }

  EventBus.emit("logging:warning", [
    `[applyGenericField] Unsupported input element for key "${key}".`,
  ]);
}
