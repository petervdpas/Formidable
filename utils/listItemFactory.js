// utils/listItemFactory.js
import { addContainerElement } from "./elementBuilders.js";
import { showOptionPopup } from "./popupUtils.js";

/**
 * value: initial value
 * options: allowed options
 * fieldKey: list field key (prefix for names)
 */
export function createListItem(value, options = []) {
  const container = addContainerElement({
    tag: "div",
    className: "list-field-item",
  });

  // Add drag handle
  addContainerElement({
    parent: container,
    tag: "span",
    className: "drag-handle list-handle",
    textContent: "↕",
  });

  const input = addContainerElement({
    parent: container,
    tag: "input",
    attributes: {
      type: "text",
      name: "list-item",
      className: "list-input",
    },
    callback: (el) => {
      el.value = value;
    },
  });

  const hasCustom = options.some(
    (opt) => typeof opt === "object" && opt.value === "[[custom]]"
  );
  const fixedOptions = options.filter(
    (opt) => typeof opt === "string" || opt.value !== "[[custom]]"
  );

  if (options.length > 0) {
    if (hasCustom && fixedOptions.length === 0) {
      // Only custom options — free text input
      input.placeholder = options.find((o) => o.value === "[[custom]]")?.label || "Enter value...";
    } else {
      // Build popup options: fixed entries + custom entry for free text
      const popupOptions = [...fixedOptions];
      const customOpt = options.find(
        (opt) => typeof opt === "object" && opt.value === "[[custom]]"
      );

      if (customOpt) {
        popupOptions.push({
          value: "[[custom]]",
          label: customOpt.label || "Custom...",
        });
      }

      input.readOnly = true;
      input.onclick = () => showOptionPopup(input, popupOptions, {
        onCustom: customOpt
          ? (inp) => {
              inp.readOnly = false;
              inp.value = "";
              inp.placeholder = customOpt.label || "Enter value...";
              inp.focus();
              inp.onclick = null;
            }
          : null,
      });

      const isValid =
        fixedOptions.some((opt) =>
          typeof opt === "string" ? opt === value : opt.value === value
        ) || (hasCustom && value && !fixedOptions.some((opt) =>
          typeof opt === "string" ? opt === value : opt.value === value
        ));

      if (!isValid && value) {
        input.classList.add("invalid-option");
        input.placeholder = "⚠ Not in list";
        input.title = "This value is not in the allowed options";
      }
    }
  }

  const removeBtn = addContainerElement({
    parent: container,
    tag: "button",
    textContent: "-",
    className: "remove-btn",
  });

  removeBtn.onclick = () => container.remove();

  return container;
}
