// utils/fieldAppliers.js

import { EventBus } from "../modules/eventBus.js";
import { createLinkOpenButton } from "../modules/uiButtons.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { showOptionPopup } from "./popupUtils.js";

export function applyGuidField(container, key, value) {
  const input = container.querySelector(`input[type="hidden"][data-guid-field="${key}"]`);
  
  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGuidField] Missing input for key "${key}".`,
    ]);
    return;
  }

  input.value = value != null ? String(value) : "";
}

export function applyRangeField(container, field, value) {
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

export function applyListField(container, field, value) {
  const key = field.key;
  const options = field.options || [];

  const listWrapper = container.querySelector(`[data-list-field="${key}"]`);
  if (!listWrapper) return;

  const addButton = listWrapper.querySelector("button");
  const existingItems = listWrapper.querySelectorAll('div input[type="text"]');
  existingItems.forEach((el) => el.parentElement.remove());

  (value || []).forEach((item) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = item;

    // If options exist, activate popup behavior
    if (options.length > 0) {
      input.readOnly = true;
      input.onclick = () => showOptionPopup(input, options);

      // Check if value is in allowed options
      const isValid = options.some((opt) =>
        typeof opt === "string" ? opt === item : opt.value === item
      );

      if (!isValid) {
        input.classList.add("invalid-option");
        input.placeholder = "⚠ Not in list";
        input.title = "This value is not in the allowed options";
      }

      if (!value) {
        requestAnimationFrame(() => {
          input.click();
        });
      }
    }

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginBottom = "6px";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.style.marginLeft = "6px";
    removeBtn.onclick = () => wrapper.remove();

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);

    listWrapper.insertBefore(wrapper, addButton);
  });
}

export function applyTableField(container, key, value) {
  const tableWrapper = container.querySelector(`[data-table-field="${key}"]`);
  if (!tableWrapper || !Array.isArray(value)) return;

  const tbody = tableWrapper.querySelector("tbody");
  tbody.innerHTML = "";

  value.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((cellValue) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = cellValue;
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdRemove = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => tr.remove();
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });
}

export function applyMultioptionField(container, key, value) {
  const wrapper = container.querySelector(`[data-multioption-field="${key}"]`);
  if (!wrapper || !Array.isArray(value)) return;

  const checkboxes = wrapper.querySelectorAll(`input[type="checkbox"]`);
  checkboxes.forEach((cb) => {
    cb.checked = value.includes(cb.value);
  });
}

export function applyImageField(container, key, value, template) {
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

export function applyGenericField(input, key, value) {
  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGenericField] Missing input for key "${key}".`,
    ]);
    return;
  }

  // Radio group (wrapped in field container)
  if (input.dataset?.radioGroup === key) {
    const radios = input.querySelectorAll(`input[type="radio"]`);
    radios.forEach((el) => {
      el.checked = String(el.value) === String(value);
    });
    return;
  }

  // Checkbox
  if (input.type === "checkbox") {
    input.checked = value === true;
    return;
  }

  // Text, number, select, etc.
  if ("value" in input) {
    // Handle undefined/null safely: if null/undefined, leave default as-is
    input.value = value != null ? String(value) : "";
    return;
  }

  EventBus.emit("logging:warning", [
    `[applyGenericField] Unsupported input element for key "${key}".`,
  ]);
}
