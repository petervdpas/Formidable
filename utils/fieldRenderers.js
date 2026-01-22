// utils/fieldRenderers.js

import { EventBus } from "../modules/eventBus.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { resolveValue, createFieldDOM } from "./fieldFactory.js";
import {
  wrapInputWithLabel,
  addContainerElement,
  createClearableInput,
  buildLabeledControl,
  buildInputFieldsGrid,
  buildCompositeElementStacked,
} from "./elementBuilders.js";
import { createDropdown, populateSelectOptions } from "./dropdownUtils.js";
import {
  applyDatasetMapping,
  applyFieldContextAttributes,
  generateGuid,
} from "./domUtils.js";
import { createButton } from "./buttonUtils.js";
import { createRemoveImageButton } from "../modules/uiButtons.js";
import { t } from "./i18n.js";
import { Toast } from "./toastUtils.js";

// ─────────────────────────────────────────────
// Type: guid
export async function renderGuidField(field, value = "") {
  const guidValue = value?.trim?.() || generateGuid();

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.setAttribute("data-guid-field", field.key);
  hidden.value = guidValue;

  applyFieldContextAttributes(hidden, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return hidden;
}

// ─────────────────────────────────────────────
// Type: loopstart
export async function renderLoopstartField(field, value = "") {
  const wrapper = document.createElement("div");

  addContainerElement({
    parent: wrapper,
    tag: "div",
    className: "loop-marker loop-start",
    textContent: field.label || "Loop Start",
  });

  addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
      value: "__loop_start__",
    },
  });

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.context || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: loopstop
export async function renderLoopstopField(field, value = "") {
  const wrapper = document.createElement("div");

  addContainerElement({
    parent: wrapper,
    tag: "div",
    className: "loop-marker loop-stop",
    textContent: field.label || "Loop Stop",
  });

  addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
      value: "__loop_stop__",
    },
  });

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: text
export async function renderTextField(field, value = "") {
  const input = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: boolean
export async function renderBooleanField(field, value = "") {
  const toggle = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(toggle, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    toggle,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: dropdown
export async function renderDropdownField(field, value = "") {
  const select = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(select, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    select,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: multioption
export async function renderMultioptionField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: radio
export async function renderRadioField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: textarea
export async function renderTextareaField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper.querySelector("textarea"), {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: number
export async function renderNumberField(field, value = "") {
  const input = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: range
export async function renderRangeField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: date
export async function renderDateField(field, value = "") {
  const input = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: list (dynamic add/remove)
export async function renderListField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: table
export async function renderTableField(field, value = "") {
  const wrapper = createFieldDOM({ ...field, type: field.type }, value);
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: image
export async function renderImageField(field, value = "", template) {
  template = await ensureVirtualLocation(template);
  const v = resolveValue(field, value);

  const wrapper = document.createElement("div");

  applyDatasetMapping(
    wrapper,
    [field, template],
    [
      { from: "key", to: "imageField" },
      { from: "virtualLocation", to: "virtualLocation" },
    ]
  );

  const input = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "file",
      name: field.key,
      accept: "image/png, image/jpeg",
    },
  });

  const preview = addContainerElement({
    parent: wrapper,
    tag: "img",
    attributes: {
      style:
        "display: none; cursor: zoom-in; max-width: 200px; max-height: 200px;",
      alt: "Image preview",
    },
  });

  // Make image clickable to show large version
  preview.addEventListener("click", () => {
    const src = preview.src;
    if (!src) return;

    const overlay = document.createElement("div");
    overlay.className = "image-modal-overlay";

    const content = document.createElement("div");
    content.className = "image-modal-content";

    const img = document.createElement("img");
    img.src = src;
    img.className = "image-modal-full";
    img.style.transform = "scale(1)";
    img.style.transition = "transform 0.1s ease";
    img.style.willChange = "transform";

    content.appendChild(img);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const help = document.createElement("div");
    help.className = "image-modal-help";
    help.innerHTML = `
      <div><kbd>Ctrl</kbd> + <kbd>Scroll</kbd> to zoom</div>
      <div><kbd>+</kbd> / <kbd>-</kbd> or <kbd>Esc</kbd> to close</div>
    `;
    overlay.appendChild(help);

    // Click outside the image to close
    overlay.addEventListener("click", (e) => {
      if (!content.contains(e.target)) {
        overlay.remove();
      }
    });

    // ESC to close
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // ─────────────────────────────
    // Grab-to-scroll logic
    // ─────────────────────────────
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    overlay.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.pageX - overlay.offsetLeft;
      startY = e.pageY - overlay.offsetTop;
      scrollLeft = overlay.scrollLeft;
      scrollTop = overlay.scrollTop;
    });

    overlay.addEventListener("mouseleave", () => {
      isDragging = false;
    });

    overlay.addEventListener("mouseup", () => {
      isDragging = false;
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - overlay.offsetLeft;
      const y = e.pageY - overlay.offsetTop;
      const walkX = x - startX;
      const walkY = y - startY;
      overlay.scrollLeft = scrollLeft - walkX;
      overlay.scrollTop = scrollTop - walkY;
    });

    // ─────────────────────────────
    // Zoom logic (+, -, Ctrl+wheel)
    // ─────────────────────────────
    let scale = 1;

    function updateZoom() {
      img.style.width = `${scale * 100}%`;
      img.style.height = "auto";

      if (scale === 1) {
        overlay.classList.add("centered");
      } else {
        overlay.classList.remove("centered");
      }
    }

    overlay.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") {
        scale = Math.min(scale + 0.1, 5);
        updateZoom();
      } else if (e.key === "-" || e.key === "_") {
        scale = Math.max(scale - 0.1, 0.2);
        updateZoom();
      }
    });

    overlay.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        scale += e.deltaY < 0 ? 0.1 : -0.1;
        scale = Math.min(Math.max(scale, 0.2), 5);
        updateZoom();
      },
      { passive: false }
    );

    // Auto-focus for keyboard zoom support
    overlay.tabIndex = 0;
    overlay.focus();
  });

  const deleteBtn = createRemoveImageButton(
    () => clearImage(),
    `delete-${field.key}`
  );
  deleteBtn.style.display = "none";

  const setImage = (src, filename = "") => {
    preview.src = src;
    preview.style.display = "block";
    deleteBtn.style.display = "inline-block";
    wrapper.setAttribute("data-filename", filename);
  };

  const clearImage = () => {
    preview.src = "";
    preview.alt = "";
    preview.style.display = "none";
    input.value = "";
    deleteBtn.style.display = "none";
    wrapper.removeAttribute("data-filename");
  };

  if (typeof v === "string" && v.trim() !== "") {
    if (template?.virtualLocation) {
      window.api.system
        .resolvePath(template.virtualLocation, "images", v)
        .then((fullPath) => {
          const src = `file://${fullPath.replace(/\\/g, "/")}`;
          setImage(src, v); // only set image if resolve succeeded
        })
        .catch(() => {
          // Do not show anything, just silently fail (no broken image)
          clearImage(); // optional: clean up any previous UI remnants
        });
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result, file.name);
      };
      reader.readAsDataURL(file);
    }
  });

  wrapper.appendChild(deleteBtn);

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label || "Image Upload",
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: link
export async function renderLinkField(
  field,
  value = "",
  currentTemplate,
  { fetchTemplates, fetchMetaFiles }
) {
  // ── helpers
  const normalize = (v) => {
    if (!v) return { href: "", text: "" };
    if (typeof v === "string") return { href: v, text: "" }; // legacy
    const href = typeof v?.href === "string" ? v.href : "";
    const text = typeof v?.text === "string" ? v.text : "";
    return { href, text };
  };
  const compact = (v) => {
    const n = normalize(v);
    if (!n.href && !n.text) return "";
    return n;
  };
  const toJSON = (v) => {
    const c = compact(v);
    return typeof c === "string" ? "" : JSON.stringify(c);
  };
  const parseFormidableHref = (href) => {
    // formidable://<template>:<entry>
    if (!href?.startsWith?.("formidable://")) return null;
    const rest = href.slice("formidable://".length);
    const idx = rest.lastIndexOf(":");
    if (idx <= 0) return null;
    return { template: rest.slice(0, idx), entry: rest.slice(idx + 1) };
  };

  const show = (el, disp = "block") => {
    if (el) el.style.display = disp;
  };
  const hide = (el) => {
    if (el) el.style.display = "none";
  };

  // ── initial value
  const initial = normalize(value || field.default);
  const parsedFormid = parseFormidableHref(initial.href);

  // ── root wrapper (column layout so “text” sits under the link controls)
  const wrapper = addContainerElement({
    tag: "div",
    callback: (el) => {
      el.dataset.linkField = field.key;
    },
  });

  // hidden persisted control (JSON or "")
  const hidden = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: { type: "hidden", name: field.key },
    callback: (el) => {
      el.value = toJSON(initial);
    },
  });

  // Row 1 (format + url | template + entry)
  const rowTop = addContainerElement({
    parent: wrapper,
    tag: "div",
    attributes: {
      style:
        "display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px;row-gap:10px;",
    },
  });

  // small helper to create a stacked label+control block
  const makeStack = ({ parent, forId, labelKey, subKey }) => {
    const block = document.createElement("div");
    block.style.display = "flex";
    block.style.flexDirection = "column";
    block.style.minWidth = "220px";

    const labObj = buildCompositeElementStacked({
      forId,
      labelKey,
      subKey,
      i18nEnabled: true,
      className: "stacked-label",
      smallClass: "label-subtext",
    });
    const labEl = labObj?.root ?? labObj; // ← unwrap to element
    block.appendChild(labEl);
    parent.appendChild(block);
    return { block };
  };

  // Format
  const { block: fmtBlock } = makeStack({
    parent: rowTop,
    forId: `${field.key}-format`,
    labelKey: "field.link.protocol",
    subKey: "field.link.protocol.hint",
  });
  const formatSelect = addContainerElement({
    parent: fmtBlock,
    tag: "select",
    attributes: { id: `${field.key}-format`, style: "min-width:180px;" },
  });
  for (const opt of ["regular", "formidable"]) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt; // translator can hook via <select> options in DOM
    formatSelect.appendChild(o);
  }

  // URL (shown when format=regular)
  const { block: urlBlock } = makeStack({
    parent: rowTop,
    forId: `${field.key}-url`,
    labelKey: "field.link.url",
    subKey: "field.link.url.hint",
  });
  const urlInput = addContainerElement({
    parent: urlBlock,
    tag: "input",
    attributes: {
      id: `${field.key}-url`,
      type: "text",
      placeholder: "https://… or formidable://…",
      style: "min-width:320px;",
    },
  });

  // Template + Entry (shown when format=formidable)
  const { block: tplBlock } = makeStack({
    parent: rowTop,
    forId: `${field.key}-tpl`,
    labelKey: "field.link.template",
    subKey: "field.link.template.hint",
  });
  const templateSelect = addContainerElement({
    parent: tplBlock,
    tag: "select",
    attributes: {
      id: `${field.key}-tpl`,
      style: "min-width:240px;display:none;",
    },
  });

  const { block: entryBlock } = makeStack({
    parent: rowTop,
    forId: `${field.key}-entry`,
    labelKey: "field.link.entry",
    subKey: "field.link.entry.hint",
  });
  const entrySelect = addContainerElement({
    parent: entryBlock,
    tag: "select",
    attributes: {
      id: `${field.key}-entry`,
      style: "min-width:260px;display:none;",
    },
  });

  // Row 2 (link text under link controls)
  const rowBottom = addContainerElement({
    parent: wrapper,
    tag: "div",
    attributes: { style: "display:block;" },
  });
  {
    const lblObj = buildCompositeElementStacked({
      forId: `${field.key}-link-text`,
      labelKey: "field.link.text",
      subKey: "field.link.text.hint",
      i18nEnabled: true,
    });
    rowBottom.appendChild(lblObj?.root ?? lblObj); // ← unwrap
  }

  const textInput = addContainerElement({
    parent: rowBottom,
    tag: "input",
    attributes: {
      id: `${field.key}-linktext`,
      type: "text",
      placeholder: "", // translator fills via <label small>; keep input clean
      style: "display:block;width:100%;max-width:none;box-sizing:border-box;",
    },
    callback: (el) => {
      el.value = initial.text || "";
    },
  });

  // auto-fill text until user types
  let userTouchedText = !!initial.text;
  textInput.addEventListener("input", () => (userTouchedText = true));

  // ── value dispatcher
  function updateHidden() {
    const fmt = formatSelect.value;
    let href = "";

    if (fmt === "regular") {
      href = urlInput.value.trim();
    } else {
      const tpl = templateSelect.value || "";
      const ent = entrySelect.value || "";
      href = tpl && ent ? `formidable://${tpl}:${ent}` : "";
    }

    hidden.value = toJSON({ href, text: textInput.value.trim() });
  }

  // ── formidable support
  async function fillTemplateDropdown() {
    templateSelect.innerHTML = "";
    const templates = (await fetchTemplates?.()) || [];
    for (const tpl of templates) {
      const o = document.createElement("option");
      o.value = tpl.filename;
      o.textContent = tpl.filename;
      templateSelect.appendChild(o);
    }
    templateSelect.value = currentTemplate || templates?.[0]?.filename || "";
  }

  function fillEntryDropdown(files = []) {
    entrySelect.innerHTML = "";
    for (const f of files) {
      const o = document.createElement("option");
      o.value = f;
      o.textContent = f;
      entrySelect.appendChild(o);
    }
  }

  async function fillEntryDropdownForSelectedTemplate() {
    const tpl = templateSelect.value;
    if (!tpl) {
      entrySelect.innerHTML = "";
      return;
    }
    const metaFiles = (await fetchMetaFiles?.(tpl)) || [];
    fillEntryDropdown(metaFiles);
  }

  // ── wire events
  formatSelect.addEventListener("change", async () => {
    const fmt = formatSelect.value;
    const showFormidable = fmt === "formidable";

    if (showFormidable) {
      hide(urlBlock);
      hide(urlInput);

      show(tplBlock, "flex");
      show(templateSelect, "block");
      show(entryBlock, "flex");
      show(entrySelect, "block");

      await fillTemplateDropdown();
      await fillEntryDropdownForSelectedTemplate();
    } else {
      show(urlBlock, "flex");
      show(urlInput, "block");

      hide(tplBlock);
      hide(templateSelect);
      hide(entryBlock);
      hide(entrySelect);

      if (
        !urlInput.value &&
        initial?.href &&
        !initial.href.startsWith("formidable://")
      ) {
        urlInput.value = initial.href;
      }
    }

    updateHidden();
  });

  templateSelect.addEventListener("change", async () => {
    await fillEntryDropdownForSelectedTemplate();
    if (!userTouchedText) {
      const val = entrySelect.value || "";
      textInput.value = val.replace(/\.meta\.json$/i, "");
    }
    updateHidden();
  });

  entrySelect.addEventListener("change", () => {
    if (!userTouchedText) {
      const val = entrySelect.value || "";
      textInput.value = val.replace(/\.meta\.json$/i, "");
    }
    updateHidden();
  });

  urlInput.addEventListener("input", () => {
    if (!userTouchedText) textInput.value = urlInput.value.trim();
    updateHidden();
  });

  textInput.addEventListener("input", updateHidden);

  // ── initialize UI from initial value
  if (parsedFormid) {
    formatSelect.value = "formidable";
    hide(urlBlock);
    hide(urlInput);

    show(tplBlock, "flex");
    show(templateSelect, "block");
    show(entryBlock, "flex");
    show(entrySelect, "block");

    await fillTemplateDropdown();
    templateSelect.value = parsedFormid.template;
    await fillEntryDropdownForSelectedTemplate();
    entrySelect.value = parsedFormid.entry;
  } else {
    formatSelect.value = "regular";
    show(urlBlock, "flex");
    show(urlInput, "block");

    hide(tplBlock);
    hide(templateSelect);
    hide(entryBlock);
    hide(entrySelect);

    urlInput.value = initial.href;
  }

  updateHidden();

  // Keep the usual field context + wrapper
  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: tags
export async function renderTagsField(field, value = "") {
  const tags = Array.isArray(value) ? value : [];
  const wrapper = document.createElement("div");
  wrapper.className = "tags-field";
  wrapper.dataset.tagsField = field.key;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "tags-input";
  input.placeholder = "Add tag and press comma or Enter";

  const tagContainer = document.createElement("div");
  tagContainer.className = "tags-container";

  function createTagElement(tagText) {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    tag.textContent = tagText;

    const remove = document.createElement("button");
    remove.className = "tag-remove";
    remove.textContent = "×";
    remove.onclick = () => {
      tagContainer.removeChild(tag);
    };

    tag.appendChild(remove);
    return tag;
  }

  // Add initial tags
  tags.forEach((tagText) => {
    tagContainer.appendChild(createTagElement(tagText));
  });

  input.addEventListener("keydown", (e) => {
    if ((e.key === "," || e.key === "Enter") && input.value.trim()) {
      e.preventDefault();
      const newTag = input.value.trim().replace(/,+$/, "");
      tagContainer.appendChild(createTagElement(newTag));
      input.value = "";
    } else if (e.key === "Backspace" && input.value === "") {
      const lastTag = tagContainer.lastElementChild;
      if (lastTag) tagContainer.removeChild(lastTag);
    }
  });

  wrapper.appendChild(tagContainer);
  wrapper.appendChild(input);

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: file
export async function renderFileField(field, value = "") {
  const core = createFieldDOM({ ...field, type: field.type }, value);

  applyFieldContextAttributes(core, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return core;
}

// ─────────────────────────────────────────────
// Type: directory
export async function renderDirectoryField(field, value = "") {
  const core = createFieldDOM({ ...field, type: field.type }, value);

  applyFieldContextAttributes(core, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return core;
}

// ─────────────────────────────────────────────
// Type: password
export async function renderPasswordField(field, value = "") {
  const core = createFieldDOM({ ...field, type: field.type }, value);
  const inputEl =
    core.querySelector("input") || core;
  applyFieldContextAttributes(inputEl, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });
  return wrapInputWithLabel(
    core,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "modal-form-row"
  );
}

// ─────────────────────────────────────────────
// Type: code (programmable) — UI reflects run_mode + i18n
export async function renderCodeField(field, value = "") {
  const src = field.default || null;
  const runMode = String(
    field.run_mode || field.runMode || "manual"
  ).toLowerCase();
  const allowRun = field.allow_run !== false;
  const hideField = field.hide_field === true;

  const wrapper = document.createElement("div");
  wrapper.className = `code-field code-mode-${runMode}`;
  wrapper.dataset.codeField = field.key;

  // hidden value that participates in form data
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = field.key;
  hidden.value = encode(value);

  applyFieldContextAttributes(hidden, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  // header: badge (i18n) + hint (i18n)
  const header = document.createElement("div");
  header.className = "code-header";

  const badge = document.createElement("span");
  badge.className = `code-mode-badge mode-${runMode}`;
  badge.textContent =
    runMode === "load"
      ? t("field.code.badge.load", "Auto-run on load")
      : runMode === "save"
      ? t("field.code.badge.save", "Runs on save")
      : t("field.code.badge.manual", "Manual run");

  const hint = document.createElement("div");
  hint.className = "code-hint";
  hint.textContent = t(
    "field.code.hint.readonly",
    "Code lives in the template (read-only)."
  );

  header.appendChild(badge);
  header.appendChild(hint);

  // toolbar
  const bar = document.createElement("div");
  bar.className = "code-toolbar";

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.className = `btn run-btn btn-mode-${runMode}`;
  runBtn.textContent = t("field.code.btn.run", "Run");
  runBtn.setAttribute("aria-label", t("aria.code.run", "Run code field"));

  // Only manual gets a Run button
  runBtn.style.display = allowRun && runMode === "manual" ? "" : "none";

  const spinner = document.createElement("span");
  spinner.className = "spinner";
  spinner.style.display = "none";
  spinner.textContent = "⏳";

  const status = document.createElement("span");
  status.className = "status";
  status.textContent = ""; // keep quiet until we have a result

  bar.appendChild(runBtn);
  bar.appendChild(spinner);
  bar.appendChild(status);

  // output area (colored per mode)
  const out = document.createElement("pre");
  out.className = `code-output mode-${runMode}`;
  out.setAttribute("aria-live", "polite");
  out.setAttribute("aria-label", t("aria.code.output", "Code field output"));

  if (value !== "" && value != null) {
    out.textContent = `// ${t(
      "field.code.output.current",
      "current value"
    )}\n${fmt(value)}`;
  }

  // helper: snake_case + camelCase
  const pick = (obj, ...keys) => {
    for (const k of keys) if (obj && obj[k] !== undefined) return obj[k];
    return undefined;
  };

  async function doRun() {
    if (!src || !String(src).trim()) {
      status.textContent = t("field.code.status.nocode", "No code in template");
      out.textContent = "";
      return;
    }

    spinner.style.display = "inline-block";
    status.textContent = t("field.code.status.running", "Running…");

    const emitWithResponse =
      (typeof window !== "undefined" && window.emitWithResponse) ||
      ((evt, payload) => EventBus.emitWithResponse(evt, payload));

    const inputMode = pick(field, "input_mode", "inputMode") || "safe";
    const apiMode = pick(field, "api_mode", "apiMode") || "frozen";
    const apiPickRaw = pick(field, "api_pick", "apiPick");
    const apiPick = Array.isArray(apiPickRaw)
      ? apiPickRaw
      : typeof apiPickRaw === "string"
      ? apiPickRaw
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const opts = optsToObject(field.options);
    const formSnap = await emitWithResponse("form:context:get");

    const payload = {
      code: String(src),
      input: { ...(pick(field, "input") ?? {}), form: formSnap },
      timeout: Number(pick(field, "timeout")) || 3000,
      inputMode,
      api: window.CFA || {},
      apiPick,
      apiMode,
      opts,
      optsAsVars: Array.isArray(field.options) && field.options.length > 0,
    };

    const res = await emitWithResponse("code:execute", payload);

    spinner.style.display = "none";
    const ok = !!res?.ok;
    status.textContent = ok
      ? t("field.code.status.ok", "OK")
      : t("field.code.status.error", "Error");

    const lines = [];
    if (res?.logs?.length) lines.push(`// console\n${res.logs.join("\n")}`);
    lines.push(
      ok
        ? `// ${t("field.code.output.result", "result")}\n${fmt(res.result)}`
        : `// ${t("field.code.output.error", "error")}\n${String(
            res?.error ?? "Unknown error"
          )}`
    );
    out.textContent = lines.join("\n\n");

    if (ok) {
      hidden.value = encode(res.result);
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Toasts only for manual runs
    if (runMode === "manual") {
      if (ok) {
        Toast.success("toast.code.run.ok", [], { duration: 2500 });
      } else {
        Toast.error(
          "toast.code.run.failed",
          [String(res?.error ?? "Unknown error")],
          { duration: 4000 }
        );
      }
    }
  }

  // Auto-run for load
  if (runMode === "load" && allowRun) {
    queueMicrotask(doRun);
  }

  runBtn.addEventListener("click", doRun);

  // assemble
  wrapper.appendChild(header);
  wrapper.appendChild(bar);
  wrapper.appendChild(out);
  wrapper.appendChild(hidden);

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  const outerWrapper = wrapInputWithLabel(
    wrapper,
    field.label || "Code",
    field.description ||
      (runMode === "save"
        ? t("field.code.desc.save", "This script runs on save.")
        : runMode === "load"
        ? t("field.code.desc.load", "This script runs when the form loads.")
        : t("field.code.desc.manual", "Click Run to execute.")),
    field.two_column,
    field.wrapper || "form-row"
  );

  if (hideField && runMode !== "manual") {
    outerWrapper.style.display = "none";
  }

  return outerWrapper;

  // helpers
  function fmt(v) {
    try {
      return typeof v === "string" ? v : JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  function encode(v) {
    if (v == null) return "";
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  function optsToObject(opts) {
    if (!opts) return {};
    const out = {};
    if (Array.isArray(opts)) {
      for (const it of opts) {
        if (it && typeof it === "object") {
          if ("value" in it) {
            const k = String(it.value).trim();
            const v = "label" in it ? String(it.label) : "";
            out[k] = v;
            continue;
          }
          if ("key" in it) {
            out[String(it.key)] = String(it.value ?? "");
            continue;
          }
        }
        if (Array.isArray(it) && it.length >= 2) {
          out[String(it[0])] = String(it[1]);
          continue;
        }
        if (typeof it === "string" && it.includes("=")) {
          const [k, ...rest] = it.split("=");
          out[k.trim()] = rest.join("=").trim();
        }
      }
      return out;
    }
    if (typeof opts === "object") return { ...opts };
    return {};
  }
}

// ─────────────────────────────────────────────
// Type: latex (stored value only; hidden in forms)
export async function renderLatexField(field, value = "") {
  //console.log("Rendering LaTeX field:", field, value);

  const v = (value ?? field.default ?? "").toString();

  const wrapper = document.createElement("div");
  wrapper.className = "latex-field";
  wrapper.setAttribute("data-latex-field", field.key);

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = field.key;
  hidden.value = String(field.default ?? ""); // v;

  applyFieldContextAttributes(hidden, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  // Optional: in-place preview (hidden unless field.preview === true)
  const pre = document.createElement("pre");
  pre.className = "latex-preview";
  pre.style.display = field.preview === true ? "" : "none";
  pre.textContent = v;

  wrapper.append(hidden, pre);

  return wrapInputWithLabel(
    wrapper,
    field.label || "LaTeX",
    field.description || "",
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Design labels cache + fetcher (once per collection)
const __apiDesignCache = new Map();

async function getDesignLabelsFor(collection) {
  if (!collection) return null;
  if (__apiDesignCache.has(collection)) return __apiDesignCache.get(collection);

  try {
    const res = await EventBus.emitWithResponse("api:design", {
      template: collection,
    });
    const labels =
      res?.ok && Array.isArray(res?.data?.fields)
        ? Object.fromEntries(
            res.data.fields.map((f) => [
              String(f.key),
              String(f.label || f.key || ""),
            ])
          )
        : null;
    __apiDesignCache.set(collection, labels);
    return labels;
  } catch {
    __apiDesignCache.set(collection, null);
    return null;
  }
}

// ─────────────────────────────────────────────
// Type: api (collection/id + editable overrides)
// Shows source (API) values as placeholders for editable fields when override is empty
export async function renderApiField(field, value = "") {
  const initial =
    typeof value === "object" && value !== null
      ? { id: String(value.id || ""), overrides: value.overrides || {} }
      : { id: String(value || field.id || ""), overrides: {} };

  const coll = (field.collection || "").trim();
  const mappings = Array.isArray(field.map) ? field.map : [];
  const editableInputs = new Map(); // key -> <input>
  const mappingByKey = new Map(); // key -> { key, path, mode, ... }
  mappings.forEach((m) => m?.key && mappingByKey.set(m.key, m));

  // 🔹 fetch design labels up-front (non-fatal if it fails)
  const designLabels = await getDesignLabelsFor(coll);

  // Root wrapper + hidden JSON payload
  const wrapper = addContainerElement({
    tag: "div",
    className: "api-field",
    attributes: { "data-api-field": field.key },
  });

  const hidden = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: { type: "hidden", name: field.key },
    callback: (el) => (el.value = JSON.stringify(initial)),
  });

  let idInput = null; // non-picker
  let idSelect = null; // picker
  let mapGrid = null; // label+input grid
  let lastFetchedDoc = null; // keep the last loaded doc to drive placeholders

  // ───────────────────────────────────────────
  // Helpers
  function updateHidden() {
    const overrides = {};
    for (const [k, el] of editableInputs.entries()) {
      const v = el.value.trim();
      if (v !== "") overrides[k] = v; // ignore empty overrides
    }
    const currentId = idSelect ? idSelect.value : idInput?.value || "";
    hidden.value = JSON.stringify({ id: String(currentId).trim(), overrides });
  }

  // Compute nested value with a safe path resolver
  function resolveByPath(obj, path) {
    if (!path) return undefined;
    return path
      .split(".")
      .filter(Boolean)
      .reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
  }

  // Set placeholders for editable inputs from the last fetched doc
  function updateEditablePlaceholdersFromDoc() {
    if (!lastFetchedDoc) return;
    for (const [k, el] of editableInputs.entries()) {
      const m = mappingByKey.get(k);
      if (!m) continue;
      const raw = resolveByPath(lastFetchedDoc, m.path || "");
      const val = raw == null ? "" : String(raw);
      // Always refresh placeholder; only show as text when input is empty
      el.placeholder =
        val || t("field.api.override.placeholder", "(override…)");
    }
  }

  async function doFetch() {
    const currentId = idSelect ? idSelect.value : idInput?.value || "";
    if (!coll) {
      status.textContent = t("field.api.status.nocollection", "No collection");
      return;
    }
    if (!currentId) {
      status.textContent = t("field.api.status.enterid", "Enter id");
      return;
    }

    status.textContent = t("field.api.status.loading", "Loading…");
    try {
      const res = await EventBus.emitWithResponse("api:get", {
        collection: coll,
        id: String(currentId).trim(),
      });
      if (!res?.ok) throw new Error(res?.error || "API error");
      const doc = res.data || {};
      lastFetchedDoc = doc;

      // fill read-only mapped values from API doc
      for (const m of mappings) {
        if (!m) continue;
        const ctl = mapGrid?.querySelector(
          `[name="${field.key}__map__${m.key}"]`
        );
        if (!ctl) continue;
        if (m.mode !== "editable") {
          const val = resolveByPath(doc, m.path || "");
          ctl.value = val == null ? "" : String(val);
        }
      }

      // refresh placeholders for editable fields (only used when empty)
      updateEditablePlaceholdersFromDoc();

      status.textContent = t("field.api.status.ok", "OK");
    } catch {
      status.textContent = t("field.api.status.error", "API error");
    }
  }

  function labelForDoc(doc, { showId = false } = {}) {
    const id = String(doc?.id ?? doc?._id ?? "").trim();
    const title = doc?.title ?? doc?.name ?? doc?.label ?? doc?.filename ?? "";
    const text = String(title || id || "");
    return showId && id ? `${text} (${id})` : text;
  }

  // ───────────────────────────────────────────
  // Top row (single line): [Label] [control] [Load] [status]
  const fetchBtn = createButton({
    text: t(
      field.use_picker ? "button.api.load" : "button.api.fetch",
      field.use_picker ? "Load" : "Fetch"
    ),
    i18nKey: field.use_picker ? "button.api.load" : "button.api.fetch",
    className: "btn-info btn-input-height",
    identifier: `api-fetch-${field.key}`,
    onClick: doFetch,
    ariaLabel: t(
      field.use_picker ? "button.api.load" : "button.api.fetch",
      field.use_picker ? "Load" : "Fetch"
    ),
  });

  const status = document.createElement("span");
  status.className = "api-status muted";
  status.textContent = "";

  const controlFactory = (host) => {
    if (field.use_picker === true) {
      // dropdown picker — NOT in the grid
      const dd = createDropdown({
        containerEl: host,
        labelTextOrKey: "",
        selectedValue: initial.id || "",
        options: [
          {
            value: "",
            label: t("field.api.picker.placeholder", "-- select --"),
          },
        ],
        i18nEnabled: false,
        onChange: () => {
          updateHidden();
          if (field.use_picker) doFetch(); // auto-load on change
        },
      });

      idSelect = dd?.selectElement || null;
      if (idSelect) {
        idSelect.name = `${field.key}__id`;
        idSelect.style.marginBottom = "0";
        idSelect.style.minWidth = "260px";
      }

      // populate picker
      (async function populatePicker() {
        let opts = [
          {
            value: "",
            label: t("field.api.picker.placeholder", "-- select --"),
          },
        ];

        if (Array.isArray(field.allowed_ids) && field.allowed_ids.length > 0) {
          if (coll) {
            try {
              const listRes = await EventBus.emitWithResponse("api:list", {
                collection: coll,
                include: "summary",
                limit: 1000,
                offset: 0,
              });
              const all = Array.isArray(listRes?.data?.items)
                ? listRes.data.items
                : Array.isArray(listRes?.data)
                ? listRes.data
                : [];
              const allowedSet = new Set(field.allowed_ids.map(String));
              const filtered = all.filter((d) =>
                allowedSet.has(String(d?.id ?? d?._id ?? ""))
              );
              opts = opts.concat(
                filtered.map((doc) => {
                  const id = String(doc?.id ?? doc?._id ?? "").trim();
                  return { value: id, label: labelForDoc(doc) };
                })
              );
              // ensure missing allowed ids still appear
              for (const missingId of allowedSet) {
                if (
                  !filtered.find(
                    (d) => String(d?.id ?? d?._id ?? "") === missingId
                  )
                ) {
                  opts.push({ value: missingId, label: missingId });
                }
              }
            } catch {
              opts = opts.concat(
                field.allowed_ids.map((id) => ({
                  value: String(id),
                  label: String(id),
                }))
              );
            }
          } else {
            opts = opts.concat(
              field.allowed_ids.map((id) => ({
                value: String(id),
                label: String(id),
              }))
            );
          }
        } else if (coll) {
          try {
            const listRes = await EventBus.emitWithResponse("api:list", {
              collection: coll,
              include: "summary",
              limit: 1000,
              offset: 0,
            });
            const items = Array.isArray(listRes?.data?.items)
              ? listRes.data.items
              : Array.isArray(listRes?.data)
              ? listRes.data
              : [];
            opts = opts.concat(
              items
                .map((doc) => {
                  const id = String(doc?.id ?? doc?._id ?? "").trim();
                  if (!id) return null;
                  return { value: id, label: labelForDoc(doc) };
                })
                .filter(Boolean)
            );
          } catch {
            /* keep placeholder */
          }
        }

        if (idSelect) populateSelectOptions(idSelect, opts, initial.id || "");
      })();

      return host.firstElementChild || host;
    }

    // non-picker: clearable text input
    const clear = createClearableInput({
      id: `${field.key}__id`,
      placeholder: t("field.api.id.placeholder", "record id"),
      value: initial.id || "",
      size: "md",
      onInput: updateHidden,
      onClear: updateHidden,
    });
    clear.style.minWidth = "220px";
    idInput = clear.input;
    idInput.name = `${field.key}__id`;
    host.appendChild(clear);
    return clear;
  };

  const topRow = buildLabeledControl({
    labelTextOrKey: field.id_label || t("field.api.picker.item", "Record"),
    control: controlFactory,
    actions: [fetchBtn, status],
    layout: "inline",
    className: "form-row tight-gap",
    suppressInnerLabel: true,
    gap: "8px",
    labelWidth: "var(--label-width, max(160px, 22ch))",
  });
  topRow.style.alignItems = "center";
  wrapper.appendChild(topRow);

  // ───────────────────────────────────────────
  // Input-only grid for mapped fields (use real labels when available)
  const items = mappings.map((m) => {
    const niceLabel =
      m.label || // explicit per-mapping label (optional)
      (designLabels && designLabels[m.key]) || // real label from design
      m.key ||
      m.path ||
      ""; // fallback

    return {
      label: niceLabel,
      forId: `${field.key}__map__${m.key}`,
      control: () => {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.id = `${field.key}__map__${m.key}`;
        inp.name = `${field.key}__map__${m.key}`;
        inp.placeholder = t("field.api.map.placeholder", "(override…)"); // will be replaced with source value after fetch
        if (m.mode !== "editable") inp.readOnly = true;
        if (m.mode === "editable" && initial.overrides?.[m.key] != null) {
          inp.value = String(initial.overrides[m.key]);
        }
        if (m.mode === "editable") {
          editableInputs.set(m.key, inp);
          // when user clears the input, show source value as placeholder again
          inp.addEventListener("input", () => {
            if (inp.value === "") {
              // repopulate placeholder from doc if we have it
              const val = resolveByPath(lastFetchedDoc || {}, m.path || "");
              inp.placeholder = val
                ? String(val)
                : t("field.api.override.placeholder", "(override…)");
            }
            updateHidden();
          });
        }
        return inp;
      },
    };
  });

  mapGrid = buildInputFieldsGrid({
    items,
    className: "api-map-grid",
    labelCol: "var(--ifg-label-width, max(160px, 22ch))",
    gap: "6px 10px",
  });
  wrapper.appendChild(mapGrid);

  // ───────────────────────────────────────────
  // Wire events + initial sync
  if (idInput) idInput.addEventListener("input", updateHidden);
  if (idSelect) {
    idSelect.addEventListener("change", () => {
      updateHidden();
      if (field.use_picker) doFetch();
    });
  }
  for (const [, el] of editableInputs) {
    // already has an input listener above; keep this as a safety
    el.addEventListener("change", updateHidden);
  }

  updateHidden();

  // If an initial id exists, fetch once so placeholders for editable fields are filled
  if (coll && (initial.id || field.use_picker)) {
    // don't block rendering; kickoff and let it paint
    setTimeout(() => {
      doFetch();
    }, 0);
  }

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label || "API",
    field.description || "",
    field.two_column,
    field.wrapper || "form-row"
  );
}
