// utils//dropdownUtils.js

import { EventBus } from "../modules/eventBus.js";
import { createStyledLabel, createStyledSelect } from "./elementBuilders.js";

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

export function createDropdown({
  containerId,
  labelText,
  selectedValue = "",
  options = [],
  onChange,
  onRefresh,
}) {
  const container = document.getElementById(containerId);
  if (!container) {
    EventBus.emit("logging:warning", [
      `[DropdownManager] Container #${containerId} not found.`,
    ]);
    return;
  }

  container.innerHTML = ""; // Clear old content

  const label = createStyledLabel(labelText);
  const select = createStyledSelect();

  populateSelectOptions(select, options, selectedValue);

  select.addEventListener("change", (e) => {
    const selected = e.target.value;
    EventBus.emit("logging:default", [
      `[DropdownManager] Selection changed to: ${selected}`,
    ]);
    if (onChange) onChange(selected);
  });

  container.appendChild(label);
  container.appendChild(select);

  return {
    selectElement: select,
    getSelected: () => {
      const val = select.value;
      return val;
    },
    setSelected: (value) => {
      select.value = value;
      if (onChange) onChange(value);
    },
    updateOptions: (newOptions) => {
      populateSelectOptions(select, newOptions, selectedValue);
    },
    refresh: async () => {
      if (typeof onRefresh !== "function") {
        EventBus.emit("logging:warning", [
          `[DropdownManager] refresh() called but no onRefresh handler provided.`,
        ]);
        return;
      }
      try {
        const newOptions = await onRefresh();
        populateSelectOptions(select, newOptions, selectedValue);

        const current = select.value;
        const values = newOptions.map((opt) => opt.value);
        if (!values.includes(current)) {
          select.value = "";
          if (onChange) onChange("");
        }
      } catch (err) {
        EventBus.emit("logging:error", [
          `[DropdownManager] refresh() failed:`,
          err,
        ]);
      }
    },
  };
}
