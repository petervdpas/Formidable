// modules/uiButtons.js

import { createButton, createIconButton } from "../utils/buttonUtils.js";

export function createProfileAddButton(onClick) {
  return createButton({
    text: "Create",
    className: "btn-info btn-input-height",
    identifier: "create-profile",
    onClick,
  });
}

export function createFieldEditIconButton(idx, onClick) {
  return createIconButton({
    iconClass: "fa fa-pencil",
    className: "btn-icon btn-icon-warn",
    identifier: "field-edit-${idx}",
    onClick,
    attributes: { "data-idx": idx, "data-action": "edit" },
    ariaLabel: "Edit",
  });
}

export function createFieldEditButton(idx, onClick) {
  return createButton({
    text: "Edit",
    className: "btn-warn",
    identifier: `field-edit-${idx}`,
    onClick,
  });
}

export function createFieldDeleteIconButton(idx, onClick) {
  return createIconButton({
    iconClass: "fa fa-trash-o",
    className: "btn-icon btn-icon-danger",
    identifier: `field-delete-${idx}`,
    onClick,
    attributes: { "data-idx": idx, "data-action": "delete" },
    ariaLabel: "Delete",
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

export function createTemplateSaveIconButton(onClick) {
  return createIconButton({
    iconClass: "fa fa-floppy-o",
    className: "btn-icon btn-icon-warn",
    identifier: "template-save",
    onClick,
    ariaLabel: "Save",
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

export function createTemplateDeleteIconButton(onClick) {
  return createIconButton({
    iconClass: "fa fa-trash-o",
    className: "btn-icon btn-icon-danger",
    identifier: "template-delete",
    onClick,
    ariaLabel: "Delete",
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
    iconClass: "fa fa-floppy-o",
    className: "btn-icon btn-icon-warn",
    identifier: "form-save-icon",
    onClick,
    ariaLabel: "Save",
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
    iconClass: "fa fa-trash-o",
    className: "btn-icon btn-icon-danger",
    identifier: "form-delete-icon",
    onClick,
    ariaLabel: "Delete",
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
    ariaLabel: "Render",
  });
}

export function createGitCommitButton(onClick, disabled = false) {
  return createButton({
    text: "Commit",
    className: "btn-info",
    identifier: "git-commit",
    onClick,
    disabled,
    ariaLabel: "Commit changes",
  });
}

export function createGitPushButton(onClick, disabled = false) {
  return createButton({
    text: "Push",
    className: "btn-info",
    identifier: "git-push",
    onClick,
    disabled,
    ariaLabel: "Push to remote",
  });
}

export function createGitPullButton(onClick, disabled = false) {
  return createButton({
    text: "Pull",
    className: "btn-info",
    identifier: "git-pull",
    onClick,
    disabled,
    ariaLabel: "Pull from remote",
  });
}

export function createFlaggedToggleButton(initialFlagged, onClick) {
  const btn = createIconButton({
    iconClass: "fa fa-flag",
    className: initialFlagged ? "btn-flagged" : "btn-unflagged",
    identifier: "form-flagged-toggle",
    ariaLabel: initialFlagged ? "Unflag" : "Flag",
  });

  btn._flagged = initialFlagged;

  btn.onclick = () => {
    btn._flagged = !btn._flagged;

    // Toggle classes zonder inhoud te verwijderen
    btn.classList.toggle("btn-flagged", btn._flagged);
    btn.classList.toggle("btn-unflagged", !btn._flagged);

    btn.setAttribute("aria-label", btn._flagged ? "Unflag" : "Flag");

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

export function createLinkOpenButton(linkText, onClick, disabled = false) {
  return createButton({
    text: linkText,
    className: "btn-link",
    identifier: "link-open",
    onClick,
    disabled,
    ariaLabel: `Open ${linkText}`,
  });
}

// Plugin-specific buttons
export function createPluginReloadButton(onClick) {
  return createButton({
    text: "Reload Plugins",
    className: "btn-default btn-fullwidth",
    identifier: "reload-plugins",
    onClick,
  });
}

export function createPluginCreateButton(onClick) {
  return createButton({
    text: "Create Plugin",
    className: "btn-okay",
    identifier: "create-plugin",
    onClick,
  });
}

export function createPluginUploadButton(onClick) {
  return createButton({
    text: "Upload Plugin",
    className: "btn-okay",
    identifier: "upload-plugin",
    onClick,
  });
}

export function createPluginDeleteButton(name, onClick) {
  return createButton({
    text: "Delete",
    className: "btn-danger btn-small",
    identifier: `plugin-delete-${name}`,
    onClick,
    ariaLabel: `Delete plugin ${name}`,
  });
}

export function createPluginToggleButton(name, enabled, onClick) {
  return createButton({
    text: enabled ? "Disable" : "Enable",
    className: "btn-small",
    identifier: `plugin-toggle-${name}`,
    onClick,
    ariaLabel: `${enabled ? "Disable" : "Enable"} plugin ${name}`,
  });
}
