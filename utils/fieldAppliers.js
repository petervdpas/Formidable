// utils/fieldAppliers.js

import { EventBus } from "../modules/eventBus.js";
import { createLinkOpenButton } from "../modules/uiButtons.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { showOptionPopup } from "./popupUtils.js";
import { createSortable } from "./domUtils.js";
import { wrapInputWithLabel } from "./elementBuilders.js";

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
  const scope =
    sortableList?.dataset?.dndScope ||
    listWrapper?.dataset?.dndScope ||
    `list:${key}:global`;

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
  const scope =
    tbody?.dataset?.dndScope ||
    tableWrapper?.dataset?.dndScope ||
    `table:${key}:global`;
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

  // Select by ID (renderLinkField sets these ids)
  const formatSelect =
    wrapper.querySelector(`#${key}-format`) || wrapper.querySelector("select");
  const templateSelect = wrapper.querySelector(`#${key}-tpl`);
  const entrySelect = wrapper.querySelector(`#${key}-entry`);
  const urlInput =
    wrapper.querySelector(`#${key}-url`) ||
    wrapper.querySelector('input[type="text"]');

  const fetchTemplates =
    eventFunctions.fetchTemplates || (() => Promise.resolve([]));
  const fetchMetaFiles =
    eventFunctions.fetchMetaFiles || (() => Promise.resolve([]));

  // normalize new/legacy value
  const { href, text } =
    typeof value === "string"
      ? { href: value.trim(), text: "" }
      : {
          href: value?.href?.trim?.() || "",
          text: value?.text?.trim?.() || "",
        };

  const textInput = wrapper.querySelector(`#${key}-link-text`);
  if (textInput) {
    textInput.value = text || "";
  }

  // i18n helper
  const tr = (k, fallback) =>
    (window.i18n?.t && window.i18n.t(k)) ||
    (typeof t === "function" && t(k)) ||
    fallback;

  // Parse formidable://<tpl>:<entry>
  const parseFormidable = (link) => {
    if (!link?.startsWith?.("formidable://")) return null;
    const rest = link.slice("formidable://".length);
    const idx = rest.lastIndexOf(":");
    if (idx <= 0) return null;
    return { tpl: rest.slice(0, idx), entry: rest.slice(idx + 1) };
  };

  // Ensure a SINGLE, labeled row for the bare link preview/open
  // We build a form-row using wrapInputWithLabel so it matches your UX.
  let bareRow = wrapper.parentElement.querySelector(
    `.link-bare-row[data-for="${key}"]`
  );
  let actionButton = null;

  if (!bareRow) {
    // content: a simple container that will hold the open button
    const content = document.createElement("div");
    content.className = "bare-link-content";
    content.style.display = "inline-flex";
    content.style.alignItems = "center";

    function onLinkClick() {
      const link = actionButton?.dataset.href || "";
      if (link.startsWith("formidable://")) {
        const parsed = parseFormidable(link) || {};
        EventBus.emit("link:formidable:navigate", {
          link,
          template: parsed.tpl || templateSelect?.value || "",
          entry: parsed.entry || entrySelect?.value || "",
        });
      } else if (/^https?:\/\//i.test(link)) {
        EventBus.emit("link:external:open", {
          url: link,
          variant: "external",
        });
      } else {
        EventBus.emit("logging:warning", [
          "[applyLinkField] Unknown link format:",
          link,
        ]);
      }
    }

    actionButton = createLinkOpenButton(href || "(no link)", onLinkClick);
    actionButton.dataset.href = href;
    content.appendChild(actionButton);

    // Build a labeled row using your helper
    bareRow = wrapInputWithLabel(
      content,
      tr("field.link.bare", "Bare Link"),
      "",
      "single",
      "form-row link-bare-row",
      null,
      "field.link.bare"
    );
    bareRow.dataset.for = key;

    // Insert AFTER the main field wrapper
    wrapper.parentElement.insertBefore(bareRow, wrapper.nextSibling);
  } else {
    // Reuse existing button
    actionButton = bareRow.querySelector("#btn-link-open");
    if (!actionButton) {
      const content = bareRow.querySelector(".bare-link-content") || bareRow;
      function onLinkClick() {}
      actionButton = createLinkOpenButton(href || "(no link)", onLinkClick);
      content.appendChild(actionButton);
    }
  }

  function updateHref(h) {
    if (!actionButton) return;
    actionButton.dataset.href = h;
    actionButton.textContent = h || "(no link)";
    actionButton.disabled = !h || !h.trim();
    // Hide the whole row if empty for cleanliness
    bareRow.style.display = actionButton.disabled ? "none" : "";
  }

  // Empty value → show regular URL UI
  if (!href) {
    if (formatSelect) formatSelect.value = "regular";
    if (urlInput) {
      urlInput.value = "";
      urlInput.style.display = "block";
    }
    if (templateSelect) templateSelect.style.display = "none";
    if (entrySelect) entrySelect.style.display = "none";
    updateHref("");
    return;
  }

  // Formidable link
  if (href.startsWith("formidable://")) {
    if (formatSelect) formatSelect.value = "formidable";

    const parsed = parseFormidable(href);
    const tpl = parsed?.tpl || "";
    const entry = parsed?.entry || "";

    if (templateSelect) {
      const templates = await fetchTemplates();
      templateSelect.innerHTML = "";
      templates.forEach((t) => {
        const o = document.createElement("option");
        o.value = t.filename;
        o.textContent = t.filename;
        templateSelect.appendChild(o);
      });
      templateSelect.value = tpl;
      templateSelect.style.display = "inline-block";
    }

    if (entrySelect) {
      const metaFiles = await fetchMetaFiles(tpl);
      entrySelect.innerHTML = "";
      metaFiles.forEach((file) => {
        const o = document.createElement("option");
        o.value = file;
        o.textContent = file;
        entrySelect.appendChild(o);
      });
      entrySelect.value = entry;
      entrySelect.style.display = "inline-block";
    }

    if (urlInput) urlInput.style.display = "none";
    updateHref(href);
    return;
  }

  // Regular http(s)
  if (formatSelect) formatSelect.value = "regular";
  if (urlInput) {
    urlInput.value = href;
    urlInput.style.display = "block";
  }
  if (templateSelect) templateSelect.style.display = "none";
  if (entrySelect) entrySelect.style.display = "none";
  updateHref(href);
}

export function applyTagsField(container, field, value) {
  const key = field.key;
  const wrapper = container.querySelector(`[data-tags-field="${key}"]`);
  if (!wrapper || !Array.isArray(value)) return;

  const tagContainer = wrapper.querySelector(".tags-container");
  if (!tagContainer) {
    EventBus.emit("logging:warning", [
      `[applyTagsField] Missing .tags-container for key "${key}".`,
    ]);
    return;
  }

  // Clear existing chips
  tagContainer.innerHTML = "";

  // Recreate chips like renderTagsField()
  function createTagElement(tagText) {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    tag.textContent = tagText;

    const remove = document.createElement("button");
    remove.className = "tag-remove";
    remove.textContent = "×";
    remove.onclick = () => tagContainer.removeChild(tag);

    tag.appendChild(remove);
    return tag;
  }

  value.forEach((t) => {
    const txt = String(t || "").trim();
    if (txt) tagContainer.appendChild(createTagElement(txt));
  });

  // Leave the input alone (user can keep typing)
}

// latex
export function applyLatexField(container, field, value) {
  const key = field.key;
  const wrap = container.querySelector(`[data-latex-field="${key}"]`);
  if (!wrap) return;

  const v = (value ?? "").toString();

  const hidden = wrap.querySelector(`input[type="hidden"][name="${key}"]`);
  if (hidden) hidden.value = v;

  const pre = wrap.querySelector(".latex-preview");
  if (pre) pre.textContent = v;
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
