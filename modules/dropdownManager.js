// modules/dropdownManager.js

import { log, warn, error } from "./logger.js";
import {
  createStyledLabel,
  createStyledSelect,
  populateSelectOptions,
} from "../utils/elementBuilders.js";

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
    error(`[DropdownManager] Container #${containerId} not found.`);
    return;
  }

  log(
    `[DropdownManager] Creating dropdown in #${containerId} with label "${labelText}"`
  );

  container.innerHTML = ""; // Clear old content

  const label = createStyledLabel(labelText);
  const select = createStyledSelect();

  populateSelectOptions(select, options, selectedValue);

  select.addEventListener("change", (e) => {
    const selected = e.target.value;
    log(`[DropdownManager] Selection changed to: ${selected}`);
    if (onChange) onChange(selected);
  });

  container.appendChild(label);
  container.appendChild(select);

  log(`[DropdownManager] Dropdown created with ${options.length} options.`);

  return {
    selectElement: select,
    getSelected: () => {
      const val = select.value;
      log(`[DropdownManager] getSelected() -> ${val}`);
      return val;
    },
    setSelected: (value) => {
      log(`[DropdownManager] setSelected() -> ${value}`);
      select.value = value;
      if (onChange) onChange(value);
    },
    updateOptions: (newOptions) => {
      log(
        `[DropdownManager] updateOptions() called with ${newOptions.length} options.`
      );
      populateSelectOptions(select, newOptions, selectedValue);
    },
    refresh: async () => {
      if (typeof onRefresh !== "function") {
        warn(
          `[DropdownManager] refresh() called but no onRefresh handler provided.`
        );
        return;
      }
      try {
        const newOptions = await onRefresh();
        populateSelectOptions(select, newOptions, selectedValue);

        const current = select.value;
        const values = newOptions.map((opt) => opt.value);
        if (!values.includes(current)) {
          log(
            `[DropdownManager] Current selection "${current}" no longer valid, clearing selection.`
          );
          select.value = "";
          if (onChange) onChange("");
        }

        log(`[DropdownManager] refresh() updated options.`);
      } catch (err) {
        error(`[DropdownManager] refresh() failed:`, err);
      }
    },
  };
}
