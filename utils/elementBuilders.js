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
    marginBottom: "10px",
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

export function wrapInputWithLabel(inputElement, labelText) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-row";

  const label = document.createElement("label");
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(inputElement);
  return wrapper;
}
