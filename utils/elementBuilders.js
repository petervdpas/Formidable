// utils/elementBuilders.js

import { createDropdown } from "./dropdownUtils.js";
import { createPanelButton } from "./buttonUtils.js";
import { t } from "./i18n.js";

export function createStyledLabel(
  text,
  { forId = null, className = "", styles = {}, i18nKey = null } = {}
) {
  const label = document.createElement("label");

  if (forId) label.htmlFor = forId;
  if (className) label.className = className;

  // Apply default and custom styles
  Object.assign(label.style, {
    display: "block",
    marginBottom: "6px",
    ...styles,
  });

  if (i18nKey) {
    label.setAttribute("data-i18n", i18nKey);
    label.textContent = t(i18nKey) || text;
  } else {
    label.textContent = text;
  }

  return label;
}

export function createStyledSelect({
  className = "",
  styles = {},
  attributes = {},
} = {}) {
  const select = document.createElement("select");
  if (className) select.className = className;

  // Apply default and custom styles
  Object.assign(select.style, {
    width: "100%",
    padding: "6px",
    marginBottom: "4px",
    ...styles,
  });

  // Apply any additional HTML attributes (e.g. id, name, data-* props)
  Object.entries(attributes).forEach(([key, val]) => {
    select.setAttribute(key, val);
  });

  return select;
}

export function createClearableInput({
  id,
  placeholder = "",
  className = "",
  type = "text",
  value = "",
  disabled = false,
  size = "md",
  clearTooltip = "Clear",
  onInput = null,
  onClear = null,
} = {}) {
  const wrap = document.createElement("div");
  wrap.className = `clear-input size-${size}`.trim();

  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.placeholder = placeholder;
  input.value = value;
  input.disabled = !!disabled;
  input.className = className || "text-input";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "clear-input-btn";
  btn.setAttribute("aria-label", clearTooltip);
  btn.title = clearTooltip;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M4.7 4.7a1 1 0 0 1 1.4 0L10 8.6l3.9-3.9a1 1 0 0 1 1.4 1.4L11.4 10l3.9 3.9a1 1 0 1 1-1.4 1.4L10 11.4l-3.9 3.9a1 1 0 0 1-1.4-1.4L8.6 10 4.7 6.1a1 1 0 0 1 0-1.4z" fill="currentColor"/>
    </svg>
  `;

  const toggle = () => {
    const show = input.value.trim().length > 0 && !input.disabled;
    btn.classList.toggle("show", show); // CSS makes it non-interactive when hidden
  };

  const emitInput = () => {
    if (typeof onInput === "function") onInput(input.value);
  };

  input.addEventListener("input", () => {
    toggle();
    emitInput();
  });

  input.addEventListener("keyup", (e) => {
    if (e.key === "Escape" && input.value) {
      btn.click();
      e.stopPropagation();
    }
  });

  btn.addEventListener("mousedown", (e) => {
    // prevent focus flicker/blur on some browsers
    e.preventDefault();
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    input.value = "";
    toggle();
    emitInput(); // propagate the change to listeners
    input.focus();
    if (typeof onClear === "function") onClear();
  });

  requestAnimationFrame(toggle);

  wrap.appendChild(input);
  wrap.appendChild(btn);

  // convenience
  wrap.getValue = () => input.value;
  wrap.setValue = (v = "") => {
    input.value = v;
    toggle();
    emitInput();
  };
  wrap.input = input;
  wrap.button = btn;

  return wrap;
}

export function createFilterField({
  id,
  labelText = "",
  labelKey = null, // i18n key
  placeholder = "",
  size = "md",
  disabled = false,
  onInput = null,
  onClear = null,
} = {}) {
  const row = document.createElement("div");
  row.className = "filter-chunk filter-field";

  const label = document.createElement("label");
  label.className = "filter-label";
  label.htmlFor = id;
  if (labelKey) {
    label.setAttribute("data-i18n", labelKey);
    label.textContent = t(labelKey);
  } else {
    label.textContent = labelText;
  }
  row.appendChild(label);

  const clearable = createClearableInput({
    id,
    placeholder,
    size,
    disabled,
    onInput,
    onClear,
    className: "tag-filter-input",
  });
  clearable.style.flex = "1";
  row.appendChild(clearable);

  return {
    element: row,
    input: clearable.input,
    label,
    clearButton: clearable.button,
  };
}

export function addContainerElement({
  parent = null,
  tag = "div",
  className = "",
  textContent = "",
  attributes = {},
  i18nKey = "",
  i18nArgs = null,
  callback = null,
} = {}) {
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (textContent) el.textContent = textContent;

  // Add attributes
  Object.entries(attributes).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });

  // If translation key is provided, add data-i18n (+ optional args)
  if (i18nKey) {
    el.setAttribute("data-i18n", i18nKey);
    if (Array.isArray(i18nArgs)) {
      el.setAttribute("data-i18n-args", JSON.stringify(i18nArgs));
      if (!textContent) el.textContent = t(i18nKey, i18nArgs, "");
    } else if (!textContent) {
      el.textContent = t(i18nKey, "");
    }
  }

  // Run optional callback to set properties
  if (typeof callback === "function") {
    callback(el);
  }

  // Append if parent is provided
  if (parent) parent.appendChild(el);

  return el;
}

export function createLabelElement({
  text = "",
  forId = null,
  className = "",
  i18nKey = null,
  isDynamic = false,
  value = "",
} = {}) {
  const label = document.createElement("label");
  if (forId) label.htmlFor = forId;
  if (className) label.className = className;

  if (isDynamic && i18nKey) {
    const keySpan = document.createElement("span");
    keySpan.setAttribute("data-i18n", i18nKey);
    keySpan.textContent = t(i18nKey);

    const valueSpan = document.createElement("span");
    valueSpan.textContent = `: ${value}`;

    label.appendChild(keySpan);
    label.appendChild(valueSpan);
  } else {
    label.textContent = text;
    if (i18nKey) {
      label.setAttribute("data-i18n", i18nKey);
    }
  }

  return label;
}

export function createFormLegend(i18nKeyOrText, i18nEnabled = false) {
  const legend = document.createElement("legend");

  if (i18nEnabled) {
    legend.setAttribute("data-i18n", i18nKeyOrText);
    legend.textContent = t(i18nKeyOrText);
  } else {
    legend.textContent = i18nKeyOrText;
  }

  return legend;
}

export function createFormRowInput({
  id,
  labelOrKey,
  value,
  placeholder = "",
  type = "text",
  configKey = id,
  onSave = null,
  multiline = false,
  append = null,
  i18nEnabled = false,
}) {
  const row = document.createElement("div");
  row.className = "modal-form-row";

  const labelEl = createLabelElement({
    text: i18nEnabled ? t(labelOrKey) : labelOrKey,
    forId: id,
    i18nKey: i18nEnabled ? labelOrKey : null,
  });

  const input = multiline
    ? document.createElement("textarea")
    : document.createElement("input");

  if (!multiline) input.type = type;

  input.id = id;
  input.name = configKey;
  input.value = value || "";
  input.placeholder = placeholder;

  input.onchange = async () => {
    const newVal = input.value.trim();
    if (onSave) {
      onSave(newVal);
    } else {
      EventBus.emit("status:update", {
        message: "status.basic.setTo",
        languageKey: "status.basic.setTo",
        i18nEnabled: true,
        args: [labelOrKey, newVal],
      });
    }
  };

  row.appendChild(labelEl);
  row.appendChild(input);

  if (append instanceof HTMLElement) {
    append.classList.add("inline-after-input");
    row.appendChild(append);
  }

  return row;
}

export function createFormRowDropdown({
  id,
  labelOrKey,
  selectedValue = "",
  options = [],
  onChange = null,
  onRefresh = null,
  i18nEnabled = false,
}) {
  const row = document.createElement("div");
  row.className = "modal-form-row";

  const dd = createDropdown({
    containerEl: row,
    labelTextOrKey: labelOrKey,
    selectedValue,
    options,
    onChange,
    onRefresh,
    i18nEnabled,
  });

  if (dd?.selectElement) {
    dd.selectElement.id = id;
  }

  return { row, dropdown: dd };
}

export function buildLabeledControl({
  labelTextOrKey = "",
  i18nEnabled = false,
  forId = null,
  descriptionText = "",
  control,
  actions = [],
  layout = "inline",
  className = "modal-form-row",
  gap = "8px",
  labelWidth = null,
  suppressInnerLabel = true,
} = {}) {
  const row = document.createElement("div");
  row.className = `${className} labeled-control-row`.trim();
  if (labelWidth) row.style.setProperty("--label-width", labelWidth);

  const labelEl = createLabelElement({
    text: i18nEnabled ? t(labelTextOrKey) : labelTextOrKey,
    forId,
    i18nKey: i18nEnabled ? labelTextOrKey : null,
  });

  const left = document.createElement("div");
  const right = document.createElement("div");
  const body = document.createElement("div");

  const controlWrap = document.createElement("div");
  controlWrap.className = "control-wrap";
  controlWrap.style.flex = "1";
  controlWrap.style.minWidth = "0";

  let controlEl = null;
  if (typeof control === "function") {
    const maybe = control(controlWrap) || null;
    controlEl =
      maybe instanceof HTMLElement
        ? maybe
        : controlWrap.firstElementChild || controlWrap;
  } else if (control instanceof HTMLElement) {
    controlWrap.appendChild(control);
    controlEl = control;
  } else {
    controlEl = controlWrap;
  }

  // NEW: kill blank/inner labels that dropdowns add
  if (suppressInnerLabel) {
    controlWrap.querySelectorAll(":scope > label").forEach((lab) => {
      const txt = (lab.textContent || "").trim();
      const hasI18n = lab.hasAttribute("data-i18n");
      if (!txt && !hasI18n) lab.style.display = "none";
    });
  }

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "control-actions";
  actionsWrap.style.display = "flex";
  actionsWrap.style.alignItems = "center";
  actionsWrap.style.gap = gap;
  for (const a of actions)
    if (a instanceof HTMLElement) actionsWrap.appendChild(a);

  if (layout === "two-column") {
    row.classList.add("two-column");

    left.appendChild(labelEl);
    if (descriptionText) {
      const desc = document.createElement("div");
      desc.className = "field-description";
      desc.textContent = descriptionText;
      left.appendChild(desc);
    }

    const inline = document.createElement("div");
    inline.className = "inline-control";
    inline.style.display = "flex";
    inline.style.alignItems = "center";
    inline.style.gap = gap;

    inline.appendChild(controlWrap);
    if (actions.length) inline.appendChild(actionsWrap);

    right.appendChild(inline);
    row.appendChild(left);
    row.appendChild(right);
  } else if (layout === "stacked") {
    row.appendChild(labelEl);
    if (descriptionText) {
      const desc = document.createElement("div");
      desc.className = "field-description";
      desc.textContent = descriptionText;
      row.appendChild(desc);
    }

    body.style.display = "flex";
    body.style.alignItems = "center";
    body.style.gap = gap;
    body.appendChild(controlWrap);
    if (actions.length) body.appendChild(actionsWrap);
    row.appendChild(body);
  } else {
    row.style.display = "grid";
    row.style.alignItems = "center";
    row.style.columnGap = gap;
    const labelCol = `var(--label-width, auto)`;
    row.style.gridTemplateColumns = actions.length
      ? `${labelCol} 1fr auto`
      : `${labelCol} 1fr`;
    row.appendChild(labelEl);
    row.appendChild(controlWrap);
    if (actions.length) row.appendChild(actionsWrap);
  }

  row.labelElement = labelEl;
  row.controlElement = controlEl;
  row.actionsElement = actionsWrap;
  return row;
}

export function buildCompositeElement({
  forId,
  labelOrKey = "NOT SET",
  args = [],
  i18nEnabled = false,
}) {
  const label = document.createElement("label");
  if (forId) label.htmlFor = forId;

  const template = t(labelOrKey);
  if (!template || !template.includes("{0}")) {
    console.warn(
      "[buildCompositeElement] Missing or invalid template:",
      labelOrKey
    );
    label.textContent = template || labelOrKey;
    return label;
  }

  let rendered = template.replace(/{(\d+)}/g, (_, i) => {
    const key = args[i];
    return t(key);
  });

  rendered = rendered.replace(/{key\[(\d+)\]}/g, (_, i) => {
    if (!i18nEnabled) return "";
    const key = args[i];
    return `data-i18n="${key}"`;
  });

  label.innerHTML = rendered;

  return label;
}

/**
 * A composite <label> with the main text + a subtext stacked underneath.
 * - Keeps the real <label> element (so `for=` works + existing CSS keeps working)
 * - Subtext is a <small> with a class you can style (display:block by default)
 */
export function buildCompositeElementStacked({
  forId,
  labelKey, // e.g. "field.code.label"
  subKey, // e.g. "field.code.fullscreen"
  i18nEnabled = false,
  className = "", // copy classes from the original label if needed
  smallClass = "label-subtext",
} = {}) {
  const label = document.createElement("label");
  if (forId) label.htmlFor = forId;
  if (className) label.className = className;

  const main = document.createElement("span");
  if (i18nEnabled && labelKey) {
    main.setAttribute("data-i18n", labelKey);
    main.textContent = t(labelKey);
  } else {
    main.textContent = labelKey || "";
  }
  label.appendChild(main);

  if (subKey) {
    const hint = document.createElement("small");
    hint.className = smallClass;
    if (i18nEnabled) {
      hint.setAttribute("data-i18n", subKey);
      hint.textContent = t(subKey);
    } else {
      hint.textContent = subKey;
    }
    label.appendChild(hint);
  }

  return label;
}

export function buildExpressionLabel({
  text = "",
  classes = [],
  isTicker = false,
  tickerDuration = 8000,
} = {}) {
  function setupTicker(el, duration = 6000) {
    if (!el || !el.parentElement) return;

    const container = el.parentElement;
    const contentWidth = el.scrollWidth;
    const containerWidth = container.clientWidth;

    el.style.animation = "none";
    el.offsetHeight; // force reflow
    el.style.animation = "";

    const keyframes = [
      { transform: `translateX(${containerWidth}px)` },
      { transform: `translateX(-${contentWidth}px)` },
    ];

    el.animate(keyframes, {
      duration: duration,
      iterations: Infinity,
      easing: "linear",
    });
  }

  const container = document.createElement("div");
  container.className = "expr-wrapper";

  const span = document.createElement("span");
  span.textContent = text;

  if (Array.isArray(classes)) {
    for (const cls of classes) span.classList.add(cls);
  }

  if (isTicker || classes.includes("expr-ticker")) {
    const tickerWrap = document.createElement("div");
    tickerWrap.className = "expr-ticker-container";
    tickerWrap.appendChild(span);
    container.appendChild(tickerWrap);
    requestAnimationFrame(() => setupTicker(span, tickerDuration));
  } else {
    container.appendChild(span);
  }

  return container;
}

export function createDirectoryPicker({
  id,
  value = "",
  buttonText = "Browse",
  outerClass = "form-row tight-gap",
  placeholder = "",
  readOnly = true,
  enabled = true,
  label = "",
}) {
  const wrapper = document.createElement("div");
  wrapper.className = `${outerClass} directory-picker`;
  if (!enabled) wrapper.classList.add("disabled");

  if (label) {
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.innerText = label;
    wrapper.appendChild(labelEl);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (readOnly) input.readOnly = true;
  input.disabled = !enabled;

  const button = document.createElement("button");
  button.id = `choose-${id}`;
  button.className = "btn btn-info btn-input-height";
  button.textContent = buttonText;
  button.disabled = !enabled;

  wrapper.appendChild(input);
  wrapper.appendChild(button);

  return { element: wrapper, input, button };
}

export function createFilePicker({
  id,
  value = "",
  buttonText = "Browse",
  outerClass = "form-row tight-gap",
  placeholder = "",
  readOnly = true,
  enabled = true,
  accept = "",
  label = "",
}) {
  const wrapper = document.createElement("div");
  wrapper.className = `${outerClass} file-picker`;
  if (!enabled) wrapper.classList.add("disabled");

  if (label) {
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.innerText = label;
    wrapper.appendChild(labelEl);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (readOnly) input.readOnly = true;
  input.disabled = !enabled;

  const button = document.createElement("button");
  button.id = `choose-${id}`;
  button.className = "btn btn-info btn-input-height";
  button.textContent = buttonText;
  button.disabled = !enabled;

  wrapper.appendChild(input);
  wrapper.appendChild(button);

  return { element: wrapper, input, button };
}

export function wrapInputWithLabel(
  inputElement,
  labelText,
  descriptionText = "",
  layout = "single",
  wrapperClass = "form-row",
  forId = null,
  i18nKey = null
) {
  const isTwoColumn = layout === true || layout === "two-column";

  const classes = Array.isArray(wrapperClass)
    ? wrapperClass
    : wrapperClass.trim().split(/\s+/);

  if (isTwoColumn) classes.push("two-column");

  const wrapper = document.createElement("div");
  wrapper.className = classes.join(" ");

  const labelEl = createLabelElement({
    text: labelText,
    forId,
    i18nKey,
  });

  if (isTwoColumn && !wrapperClass?.includes("modal-form-row")) {
    const left = document.createElement("div");
    const right = document.createElement("div");

    left.appendChild(labelEl);

    if (descriptionText) {
      const desc = document.createElement("div");
      desc.className = "field-description";
      desc.textContent = descriptionText;
      left.appendChild(desc);
    }

    right.appendChild(inputElement);
    wrapper.appendChild(left);
    wrapper.appendChild(right);
  } else {
    wrapper.appendChild(labelEl);

    if (descriptionText) {
      const desc = document.createElement("div");
      desc.className = "field-description";
      desc.textContent = descriptionText;
      wrapper.appendChild(desc);
    }

    wrapper.appendChild(inputElement);
  }

  return wrapper;
}

export function buildHiddenInput(id, value = "") {
  const input = document.createElement("input");
  input.type = "hidden";
  input.id = id;
  input.name = id;
  input.value = value;
  return input;
}

export function buildReadOnlyInput(id, className, labelText, value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.readOnly = true;
  input.value = value;
  if (className) input.className = className;
  return wrapInputWithLabel(input, labelText);
}

export function buildSwitchElement({
  id,
  name = null,
  checked = false,
  onFlip = null,
  trailingValues = null,
  i18nEnabled = false,
} = {}) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  if (name) input.name = name;

  const slider = document.createElement("span");
  slider.className = "slider";

  const switchWrapper = document.createElement("label");
  switchWrapper.className = "switch";
  switchWrapper.appendChild(input);
  switchWrapper.appendChild(slider);

  const container = document.createElement("div");
  container.className = "switch-wrapper";
  container.appendChild(switchWrapper);

  let trailing = null;

  const updateTrailingText = (isChecked) => {
    if (!trailing || !Array.isArray(trailingValues)) return;

    if (i18nEnabled) {
      const key = isChecked ? trailingValues[0] : trailingValues[1];
      trailing.setAttribute("data-i18n", key);
      trailing.textContent = t(key); // immediate update; translateDOM can override later
    } else {
      trailing.removeAttribute("data-i18n");
      trailing.textContent = isChecked ? trailingValues[0] : trailingValues[1];
    }
  };

  if (Array.isArray(trailingValues)) {
    trailing = document.createElement("div");
    trailing.className = "trailing-label";
    container.appendChild(trailing);

    // Initial render
    requestAnimationFrame(() => updateTrailingText(input.checked));
  }

  input.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    if (typeof onFlip === "function") onFlip(isChecked);
    updateTrailingText(isChecked);
  });

  return { input, element: container };
}

export function createSwitch(
  id,
  labelOrKey = "",
  checked = false,
  onFlip = null,
  layout = "block",
  trailingValues = null,
  i18nEnabled = false
) {
  const { input, element: switchWithLabel } = buildSwitchElement({
    id,
    name: id,
    checked,
    onFlip,
    trailingValues,
    i18nEnabled,
  });

  const labelEl = createLabelElement({
    text: i18nEnabled ? t(labelOrKey) : labelOrKey,
    forId: id,
    i18nKey: i18nEnabled ? labelOrKey : null,
  });

  if (layout === "inline") {
    const inline = document.createElement("label");
    inline.id = `label-${id}`;
    inline.style.display = "flex";
    inline.style.alignItems = "center";
    inline.style.gap = "6px";

    inline.appendChild(labelEl);
    inline.appendChild(switchWithLabel);
    return inline;
  }

  if (layout === "two-column") {
    const wrapper = document.createElement("div");
    wrapper.className = "form-row two-column";

    const left = document.createElement("div");
    const right = document.createElement("div");

    left.appendChild(labelEl);
    right.appendChild(switchWithLabel);
    wrapper.appendChild(left);
    wrapper.appendChild(right);
    return wrapper;
  }

  // default: block
  const container = document.createElement("div");
  container.className = "modal-form-row switch-row";
  container.appendChild(labelEl);
  container.appendChild(switchWithLabel);
  return container;
}

/**
 * Inline GRID you can mount anywhere.
 * @returns {HTMLElement} container
 */
export function createOptionGrid(
  options,
  onSelect,
  {
    gridCols = 6,
    gridRows = null, // null => auto rows
    cellSize = 32,
    gridGap = 2,
    fillPlaceholders = true,
    className = "",
    ariaLabel = "Option grid",
  } = {}
) {
  const grid = document.createElement("div");
  grid.className = `option-grid ${className}`.trim();
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", ariaLabel);

  // CSS grid sizing
  grid.style.display = "grid";
  grid.style.gap = `${gridGap}px`;
  grid.style.gridTemplateColumns = `repeat(${gridCols}, ${cellSize}px)`;

  const byRC = new Map();
  const buttons = [];

  const makeBtn = (opt, r = null, c = null) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `popup-option ${opt.className || ""}`.trim();
    btn.dataset.value = opt.value ?? "";
    btn.disabled = !!opt.disabled;
    btn.innerHTML = opt.iconHTML
      ? `${opt.iconHTML}<span class="popup-option-label">${
          opt.label ?? opt.value ?? ""
        }</span>`
      : opt.label ?? opt.value ?? "";

    btn.style.boxSizing = "border-box";
    btn.style.width = "100%";
    btn.style.height = "100%";
    btn.style.padding = "0";

    if (r != null && c != null) {
      btn.style.gridRowStart = String(r + 1);
      btn.style.gridColumnStart = String(c + 1);
      byRC.set(`${r},${c}`, btn);
    }

    btn.addEventListener("click", () => {
      if (!opt.disabled && opt.value != null) onSelect?.(opt.value, opt);
    });

    grid.appendChild(btn);
    buttons.push(btn);
    return btn;
  };

  // --- NEW: figure out how many rows we must render ---
  const maxRowFromPos = options.reduce((m, o) => {
    if (Array.isArray(o.pos) && o.pos.length === 2) {
      const r1 = Number(o.pos[0]) || 0; // 1-based
      return Math.max(m, r1);
    }
    return m;
  }, 0);

  const cellsNeeded = Math.max(options.length, maxRowFromPos * gridCols);
  const autoRows = Math.max(1, Math.ceil(cellsNeeded / gridCols));
  const rowsToUse = gridRows ?? autoRows;

  // lock rows so placeholders have somewhere to go
  grid.style.gridTemplateRows = `repeat(${rowsToUse}, ${cellSize}px)`;

  // fill
  fillGrid(options, makeBtn, {
    gridRows: rowsToUse,
    gridCols,
    fillPlaceholders: !!fillPlaceholders,
  });

  return grid;
}

/**
 * Inline LIST you can mount anywhere.
 * @returns {HTMLElement} container
 */
export function createOptionList(
  options,
  onSelect,
  {
    className = "",
    ariaLabel = "Option list",
    optionHeight = 28, // purely visual; not used for sizing constraints
  } = {}
) {
  const list = document.createElement("div");
  list.className = `option-list ${className}`.trim();
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", ariaLabel);

  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `popup-option ${opt.className || ""}`.trim();
    btn.dataset.value = opt.value;
    btn.disabled = !!opt.disabled;
    btn.style.minHeight = `${optionHeight}px`;
    btn.innerHTML = opt.iconHTML
      ? `${opt.iconHTML}<span class="popup-option-label">${
          opt.label ?? opt.value
        }</span>`
      : opt.label ?? opt.value;

    btn.addEventListener("click", () => {
      if (!opt.disabled) onSelect?.(opt.value, opt);
    });

    list.appendChild(btn);
  }

  return list;
}

/**
 * A lightweight "mini-modal" style panel for popups.
 * Usage:
 *   const { element, inputs } = createOptionPanel({
 *     title: t("git.quick.title") || "Quick Commit",
 *     message: t("git.quick.subtitle") || "Write a commit message",
 *     inputs: [{ id: "commitMsg", kind: "textarea", placeholder: "Commit message…" }],
 *     actions: [
 *       { value: "stage_all", label: t("git.quick.stage_all") || "Stage all" },
 *       { value: "commit",    label: t("git.quick.commit")    || "Commit",    variant: "primary" },
 *       { value: "commit_push", label: t("git.quick.commit_push") || "Commit & Push", variant: "primary" },
 *       { value: "cancel",    label: t("standard.cancel") || "Cancel", variant: "default" },
 *     ],
 *   }, (val, ctx) => { ... });
 */
export function createOptionPanel(
  { title = "", message = "", inputs = [], actions = [], className = "" } = {},
  onAction = null
) {
  const wrap = document.createElement("div");
  wrap.className = `option-panel ${className}`.trim();

  // header
  if (title || message) {
    const header = document.createElement("div");
    header.className = "panel-header";
    if (title) {
      const h = document.createElement("div");
      h.className = "panel-title";
      h.textContent = title;
      header.appendChild(h);
    }
    if (message) {
      const m = document.createElement("div");
      m.className = "panel-subtitle";
      m.textContent = message;
      header.appendChild(m);
    }
    wrap.appendChild(header);
  }

  // body (inputs)
  const body = document.createElement("div");
  body.className = "panel-body";
  const inputRefs = {};

  for (const def of inputs) {
    const row = document.createElement("div");
    row.className = "panel-row";

    if (def.label) {
      const lab = document.createElement("label");
      if (def.id) lab.htmlFor = def.id;
      lab.textContent = def.label;
      row.appendChild(lab);
    }

    let field;
    if (def.kind === "textarea") {
      field = document.createElement("textarea");
      field.rows = def.rows || 3;
    } else {
      field = document.createElement("input");
      field.type = def.type || "text";
    }
    if (def.id) field.id = def.id;
    if (def.placeholder) field.placeholder = def.placeholder;
    if (def.value != null) field.value = def.value;
    if (def.className) field.className = def.className;

    row.appendChild(field);
    body.appendChild(row);

    if (def.id) inputRefs[def.id] = field;
  }
  wrap.appendChild(body);

  // footer (actions)
  const footer = document.createElement("div");
  footer.className = "panel-actions";

  const call = (val) => onAction?.(val, { inputs: inputRefs });

  for (const a of actions) {
    const btn = createPanelButton({
      text: a.label ?? a.value,
      i18nKey: a.i18nKey || "",
      value: a.value,
      variant: a.variant || (a.value === "cancel" ? "quiet" : "default"),
      size: a.size || "sm",
      onAction: call,
      attributes: a.attributes || {},
      ariaLabel: a.ariaLabel || a.label || a.value,
    });
    footer.appendChild(btn);
  }

  wrap.appendChild(footer);

  // quality-of-life helpers
  wrap.focusFirstInput = () => {
    const el = Object.values(inputRefs)[0];
    el?.focus?.();
  };

  return { element: wrap, inputs: inputRefs };
}

function fillGrid(options, makeBtn, settings) {
  const occupied = new Set();
  const autoFill = [];

  for (const opt of options) {
    if (Array.isArray(opt.pos) && opt.pos.length === 2) {
      let [r, c] = opt.pos.map(Number);
      if (r >= 1 && c >= 1) {
        r -= 1;
        c -= 1;
      } // allow 1-based
      if (r >= 0 && r < settings.gridRows && c >= 0 && c < settings.gridCols) {
        makeBtn(opt, r, c);
        occupied.add(`${r},${c}`);
      } else {
        autoFill.push(opt);
      }
    } else {
      autoFill.push(opt);
    }
  }

  let r = 0,
    c = 0;
  for (const opt of autoFill) {
    while (occupied.has(`${r},${c}`)) {
      c++;
      if (c >= settings.gridCols) {
        c = 0;
        r++;
      }
    }
    if (r >= settings.gridRows) break; // grid full
    makeBtn(opt, r, c);
    occupied.add(`${r},${c}`);
    c++;
    if (c >= settings.gridCols) {
      c = 0;
      r++;
    }
  }
}
