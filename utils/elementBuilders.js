// utils/elementBuilders.js

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

export function populateSelectOptions(
  selectElement,
  options = [],
  selectedValue = ""
) {
  selectElement.innerHTML = "";

  options.forEach(({ value, label, disabled = false }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.disabled = disabled;
    if (value === selectedValue) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

export function wrapInputWithLabel(
  inputElement,
  labelText,
  descriptionText = "",
  layout = "single"
) {
  const isTwoColumn = layout === true || layout === "two-column";

  const wrapper = document.createElement("div");
  wrapper.className = isTwoColumn ? "form-row two-column" : "form-row";

  if (isTwoColumn) {
    const left = document.createElement("div");
    const right = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = labelText;
    left.appendChild(label);

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
    const label = document.createElement("label");
    label.textContent = labelText;
    wrapper.appendChild(label);

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

export function buildReadOnlyInput(id, className, labelText, value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.readOnly = true;
  input.value = value;
  if (className) input.className = className;
  return wrapInputWithLabel(input, labelText);
}

export function createSwitch(
  id,
  label = "",
  checked = false,
  onFlip = null,
  layout = "block" // "inline", "block", or "two-column"
) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;

  const slider = document.createElement("span");
  slider.className = "slider";

  if (typeof onFlip === "function") {
    input.addEventListener("change", (e) => {
      onFlip(e.target.checked);
    });
  }

  const switchWrapper = document.createElement("label");
  switchWrapper.className = "switch";
  switchWrapper.appendChild(input);
  switchWrapper.appendChild(slider);

  if (layout === "inline") {
    // menubalk: label naast switch
    const inlineContainer = document.createElement("label");
    inlineContainer.id = `label-${id}`;
    inlineContainer.style.display = "flex";
    inlineContainer.style.alignItems = "center";
    inlineContainer.style.gap = "6px";

    const span = document.createElement("span");
    span.textContent = label;

    inlineContainer.appendChild(span);
    inlineContainer.appendChild(switchWrapper);
    return inlineContainer;
  }

  if (layout === "two-column") {
    // render als veld met label + switch in aparte kolommen
    const wrapper = document.createElement("div");
    wrapper.className = "form-row two-column";

    const left = document.createElement("div");
    const right = document.createElement("div");

    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    left.appendChild(labelEl);
    right.appendChild(switchWrapper);
    wrapper.appendChild(left);
    wrapper.appendChild(right);

    return wrapper;
  }

  // standard "block" layout
  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const container = document.createElement("div");
  container.className = "modal-form-row switch-row";
  container.appendChild(labelEl);
  container.appendChild(switchWrapper);

  return container;
}
