// modules/uiButtons.js

function createButton({
  text,
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
  ariaLabel = "",
}) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.id = identifier
    ? `btn-${identifier}`
    : `btn-${text.toLowerCase().replace(/\s+/g, "-")}`;
  btn.className = `btn ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  if (ariaLabel) {
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("role", "button");
    btn.setAttribute("data-tooltip", ariaLabel);
  }

  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}

export function createIconButton({
  iconClass = "", // ie. "fa fa-flag"
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
  ariaLabel = "",
}) {
  const btn = document.createElement("button");
  btn.id = identifier ? `btn-${identifier}` : `btn-icon-button`;
  btn.className = `btn icon-button ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  if (ariaLabel) {
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("role", "button");
    btn.setAttribute("data-tooltip", ariaLabel);
  }

  // Icon element
  const icon = document.createElement("i");
  icon.className = iconClass;
  btn.appendChild(icon);

  // Set extra attributes
  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}

export function buildButtonGroup(...args) {
  let extraClass = "";
  if (typeof args[args.length - 1] === "string") {
    extraClass = args.pop();
  }

  const group = document.createElement("div");
  group.className = `button-group${extraClass ? " " + extraClass : ""}`;

  args.forEach((btn) => {
    if (btn instanceof HTMLElement) group.appendChild(btn);
  });

  return group;
}

export function createProfileAddButton(onClick) {
  return createButton({
    text: "Create",
    className: "btn-info btn-input-height",
    identifier: "create-profile",
    onClick,
  });
}

export function createFieldEditButton(idx, onClick) {
  return createButton({
    text: "Edit",
    className: "btn-warn",
    identifier: `field-edit-${idx}`,
    onClick,
    attributes: { "data-idx": idx, "data-action": "edit" },
  });
}

export function createFieldDeleteButton(idx, onClick) {
  return createButton({
    text: "Delete",
    className: "btn-danger",
    identifier: `field-delete-${idx}`,
    onClick,
    attributes: { "data-idx": idx, "data-action": "delete" },
  });
}

export function createReorderUpButton(idx, disabled, onClick) {
  return createButton({
    text: "▲",
    className: "btn-light",
    identifier: `field-up-${idx}`,
    onClick,
    disabled,
    attributes: { "data-idx": idx, "data-action": "up" },
  });
}

export function createReorderDownButton(idx, total, onClick) {
  return createButton({
    text: "▼",
    className: "btn-light",
    identifier: `field-down-${idx}`,
    onClick,
    disabled: idx === total - 1,
    attributes: { "data-idx": idx, "data-action": "down" },
  });
}

export function createTemplateAddFieldButton(onClick) {
  return createButton({
    text: "+ Add Field",
    className: "btn-info",
    identifier: "template-add-field",
    onClick,
  });
}

export function createTemplateSaveButton(onClick) {
  return createButton({
    text: "Save",
    className: "btn-default btn-warn",
    identifier: "template-save",
    onClick,
  });
}

export function createTemplateDeleteButton(onClick) {
  return createButton({
    text: "Delete",
    className: "btn-default btn-danger",
    identifier: "template-delete",
    onClick,
  });
}

export function createTemplateGeneratorButton(onClick) {
  return createButton({
    text: "Generate Template",
    className: "btn-default btn-info",
    identifier: "template-generate",
    onClick,
  });
}

export function createFormSaveButton(onClick) {
  return createButton({
    text: "Save",
    className: "btn-default btn-warn",
    identifier: "form-save",
    onClick,
  });
}

export function createFormSaveIconButton(onClick) {
  return createIconButton({
    iconClass: "fa fa-save",
    className: "btn-icon btn-icon-warn",
    identifier: "form-save-icon",
    onClick,
    ariaLabel: "Save form",
  });
}

export function createFormDeleteButton(onClick) {
  return createButton({
    text: "Delete",
    className: "btn-default btn-danger",
    identifier: "form-delete",
    onClick,
  });
}

export function createFormDeleteIconButton(onClick) {
  return createIconButton({
    iconClass: "fa fa-trash",
    className: "btn-icon btn-icon-danger",
    identifier: "form-delete-icon",
    onClick,
    ariaLabel: "Delete form",
  });
}

export function createFormRenderButton(onClick) {
  return createButton({
    text: "Render",
    className: "btn-default btn-info",
    identifier: "form-render",
    onClick,
  });
}

export function createFormRenderIconButton(onClick) {
  return createIconButton({
    iconClass: "fa fa-eye",
    className: "btn-icon btn-icon-info",
    identifier: "form-render-icon",
    onClick,
    ariaLabel: "Render form",
  });
}

export function createFlaggedToggleButton(initialFlagged, onClick) {
  const btn = createIconButton({
    iconClass: "fa fa-flag",
    className: initialFlagged ? "btn-flagged" : "btn-unflagged",
    identifier: "form-flagged-toggle",
    ariaLabel: initialFlagged ? "Unflag item" : "Flag item",
  });

  btn._flagged = initialFlagged;

  btn.onclick = () => {
    btn._flagged = !btn._flagged;

    // Toggle classes zonder inhoud te verwijderen
    btn.classList.toggle("btn-flagged", btn._flagged);
    btn.classList.toggle("btn-unflagged", !btn._flagged);

    btn.setAttribute("aria-label", btn._flagged ? "Unflag item" : "Flag item");

    if (typeof onClick === "function") {
      onClick(btn._flagged);
    }
  };

  return btn;
}

export function createShowMarkdownButton(onClick) {
  return createButton({
    text: "🡐 Markdown",
    className: "modal-header-button",
    identifier: "show-markdown",
    onClick,
  });
}

export function createShowPreviewButton(onClick) {
  return createButton({
    text: "Preview 🡒",
    className: "modal-header-button",
    identifier: "show-preview",
    onClick,
  });
}

export function createCopyMarkdownButton(onClick) {
  return createButton({
    text: "⧉",
    className: "copy-btn",
    identifier: "copy-markdown",
    onClick,
    ariaLabel: "Copy Markdown",
  });
}

export function createCopyPreviewButton(onClick) {
  return createButton({
    text: "⧉",
    className: "copy-btn",
    identifier: "copy-preview",
    onClick,
    ariaLabel: "Copy HTML",
  });
}

export function createPaneCloseButton(targetPaneClass, onClick) {
  return createButton({
    text: "✕",
    className: "btn-close-special",
    identifier: `close-${targetPaneClass}`,
    onClick,
    attributes: { "data-target-pane": targetPaneClass },
  });
}

export function createAddButton({
  label = "+ Add",
  onClick,
  id = "",
  className = "btn-okay",
}) {
  return createButton({
    text: label,
    className,
    identifier: id || label.toLowerCase().replace(/\s+/g, "-"),
    onClick,
  });
}

export function createModalCloseButton({
  onClick = () => {},
  id = "modal-cancel",
  text = "✕",
  className = "btn-close",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}

export function createModalCancelButton({
  text = "Cancel",
  onClick = () => {},
  id = "modal-cancel",
  className = "btn-default",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}

export function createModalConfirmButton({
  text = "Confirm",
  onClick = () => {},
  id = "modal-confirm",
  className = "btn-okay",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}

export function createAddLoopItemButton(onClick) {
  return createButton({
    text: "+ Add Loop Item",
    className: "btn-okay add-loop-item-btn",
    identifier: "add-loop-item",
    onClick,
  });
}

export function createDeleteLoopItemButton(onClick, identifier = "") {
  return createButton({
    text: "✕",
    className: "btn-close-special btn-danger loop-item-remove",
    identifier: identifier || "loop-item-delete",
    onClick,
  });
}

export function createRemoveImageButton(onClick, identifier = "") {
  return createButton({
    text: "✕",
    className: "btn-close-special btn-remove-image",
    identifier: identifier || "remove-image",
    onClick,
  });
}

export function disableButton(btn, state = true) {
  if (btn instanceof HTMLElement) {
    btn.disabled = state;
  }
}
