// utils//dropdownUtils.js

import { EventBus } from "../modules/eventBus.js";
import { createStyledLabel, createStyledSelect } from "./elementBuilders.js";
import { t } from "./i18n.js";

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
  containerEl,
  labelTextOrKey,
  selectedValue = "",
  options = [],
  onChange,
  onRefresh,
  i18nEnabled = false,
}) {
  const container =
    containerEl || (containerId ? document.getElementById(containerId) : null);

  if (!container) {
    EventBus.emit("logging:warning", [
      `[DropdownManager] Container #${containerId ?? "undefined"} not found.`,
    ]);
    return null;
  }

  container.innerHTML = "";

  const translatedLabel = i18nEnabled ? t(labelTextOrKey) : labelTextOrKey;
  const label = createStyledLabel(translatedLabel, {
    i18nKey: i18nEnabled ? labelTextOrKey : null,
  });

  const select = createStyledSelect();
  populateSelectOptions(select, options, selectedValue);

  select.addEventListener("change", (e) => {
    const selected = e.target.value;
    EventBus.emit("logging:default", [
      `[DropdownManager] Selection changed to: ${selected}`,
    ]);
    onChange?.(selected);
  });

  container.appendChild(label);
  container.appendChild(select);

  return {
    selectElement: select,
    getSelected: () => select.value,
    setSelected: (value) => {
      select.value = value;
      onChange?.(value);
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
          onChange?.("");
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
