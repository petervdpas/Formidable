// modules/uiButtons.js

function createButton({
  text,
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
}) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.id = identifier
    ? `btn-${identifier}`
    : `btn-${text.toLowerCase().replace(/\s+/g, "-")}`;
  btn.className = `btn ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}

export function buildButtonGroup(...buttons) {
  const group = document.createElement("div");
  group.className = "button-group";
  buttons.forEach((btn) => {
    if (btn instanceof HTMLElement) group.appendChild(btn);
  });
  return group;
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

export function createFormDeleteButton(onClick) {
  return createButton({
    text: "Delete",
    className: "btn-default btn-danger",
    identifier: "form-delete",
    onClick,
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

export function createCopyMarkdownButton(onClick) {
  return createButton({
    text: "⧉",
    className: "copy-btn",
    identifier: "copy-markdown",
    onClick,
  });
}

export function createCopyPreviewButton(onClick) {
  return createButton({
    text: "⧉",
    className: "copy-btn",
    identifier: "copy-preview",
    onClick,
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
  className = "btn-light",
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

export function disableButton(btn, state = true) {
  if (btn instanceof HTMLElement) {
    btn.disabled = state;
  }
}
