// dropdownManager.js

import { log, warn, error } from "./logger.js"; // <-- ADD THIS

export function createDropdown({ containerId, labelText, options = [], onChange, selectedValue = "" }) {
  const container = document.getElementById(containerId);
  if (!container) {
    error(`[DropdownManager] Container #${containerId} not found.`);
    return;
  }

  log(`[DropdownManager] Creating dropdown in #${containerId} with label "${labelText}"`);

  container.innerHTML = ""; // Clear old content

  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.display = "block";
  label.style.marginBottom = "6px";

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.padding = "6px";
  select.style.marginBottom = "10px";

  // Populate initial options
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    const selected = e.target.value;
    log(`[DropdownManager] Selection changed to: ${selected}`);
    if (onChange) {
      onChange(selected);
    }
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
      if (onChange) {
        onChange(value);
      }
    },
    updateOptions: (newOptions) => {
      log(`[DropdownManager] updateOptions() called with ${newOptions.length} options.`);
      select.innerHTML = ""; // Clear old options
      newOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });
    }
  };
}