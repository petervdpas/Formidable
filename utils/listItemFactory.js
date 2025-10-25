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

  if (options.length > 0) {
    input.readOnly = true;
    input.onclick = () => showOptionPopup(input, options);

    const isValid = options.some((opt) =>
      typeof opt === "string" ? opt === value : opt.value === value
    );

    if (!isValid && value) {
      input.classList.add("invalid-option");
      input.placeholder = "⚠ Not in list";
      input.title = "This value is not in the allowed options";
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
