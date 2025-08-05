// utils/elementBuilders.js

import { t } from "./i18n.js";

export function createStyledLabel(
  text,
  { forId = null, className = "", styles = {} } = {}
) {
  const label = document.createElement("label");
  label.textContent = text;
  if (forId) label.htmlFor = forId;
  if (className) label.className = className;

  // Apply default and custom styles
  Object.assign(label.style, {
    display: "block",
    marginBottom: "6px",
    ...styles,
  });

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

export function addContainerElement({
  parent = null,
  tag = "div",
  className = "",
  textContent = "",
  attributes = {},
  i18nKey = "",
  callback = null,
} = {}) {
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (textContent) el.textContent = textContent;

  // Add attributes
  Object.entries(attributes).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });

  // If translation key is provided, add data-i18n
  if (i18nKey) {
    el.setAttribute("data-i18n", i18nKey);
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
} = {}) {
  const label = document.createElement("label");
  if (text) label.textContent = text;
  if (forId) label.htmlFor = forId;
  if (className) label.className = className;
  if (i18nKey) label.setAttribute("data-i18n", i18nKey);
  return label;
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
    if (onSave) onSave(newVal);
    else EventBus.emit("status:update", `${label} set to ${newVal}`);
  };

  row.appendChild(labelEl);
  row.appendChild(input);

  if (append instanceof HTMLElement) {
    append.classList.add("inline-after-input");
    row.appendChild(append);
  }

  return row;
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