// modules/uiButtons.js

import { createButton, createIconButton } from "../utils/buttonUtils.js";
import { t } from "../utils/i18n.js";

export function createProfileAddButton(onClick) {
  return createButton({
    text: t("button.create"),
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
    ariaLabel: t("aria.edit"),
  });
}

export function createFieldEditButton(idx, onClick) {
  return createButton({
    text: t("button.edit"),
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
    ariaLabel: t("aria.delete"),
  });
}

export function createFieldDeleteButton(idx, onClick) {
  return createButton({
    text: t("button.delete"),
    className: "btn-danger",
    identifier: `field-delete-${idx}`,
    onClick,
    attributes: { "data-idx": idx, "data-action": "delete" },
  });
}

export function createReorderUpButton(idx, disabled, onClick) {
  return createButton({
    text: t("button.moveUp"),
    className: "btn-light",
    identifier: `field-up-${idx}`,
    onClick,
    disabled,
    attributes: { "data-idx": idx, "data-action": "up" },
    ariaLabel: t("aria.moveUp"),
  });
}

export function createReorderDownButton(idx, total, onClick) {
  return createButton({
    text: t("button.moveDown"),
    className: "btn-light",
    identifier: `field-down-${idx}`,
    onClick,
    disabled: idx === total - 1,
    attributes: { "data-idx": idx, "data-action": "down" },
    ariaLabel: t("aria.moveDown"),
  });
}

export function createTemplateAddFieldButton(onClick) {
  return createButton({
    text: t("button.addField"),
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
    ariaLabel: t("aria.save"),
  });
}

export function createTemplateSaveButton(onClick) {
  return createButton({
    text: t("button.save"),
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
    ariaLabel: t("aria.delete"),
  });
}

export function createTemplateDeleteButton(onClick) {
  return createButton({
    text: t("button.delete"),
    className: "btn-default btn-danger",
    identifier: "template-delete",
    onClick,
  });
}

export function createTemplateGeneratorButton(onClick) {
  return createButton({
    text: t("button.generateTemplate"),
    className: "btn-default btn-info",
    identifier: "template-generate",
    onClick,
  });
}

export function createFormSaveButton(onClick) {
  return createButton({
    text: t("button.save"),
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
    ariaLabel: t("aria.save"),
  });
}

export function createFormDeleteButton(onClick) {
  return createButton({
    text: t("button.delete"),
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
    ariaLabel: t("aria.delete"),
  });
}

export function createFormRenderButton(onClick) {
  return createButton({
    text: t("button.render"),
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
    ariaLabel: t("aria.render"),
  });
}

export function createGitCommitButton(onClick, disabled = false) {
  return createButton({
    text: t("button.commit"),
    className: "btn-info",
    identifier: "git-commit",
    onClick,
    disabled,
    ariaLabel: t("aria.commit"),
  });
}

export function createGitPushButton(onClick, disabled = false) {
  return createButton({
    text: t("button.push"),
    className: "btn-info",
    identifier: "git-push",
    onClick,
    disabled,
    ariaLabel: t("aria.push"),
  });
}

export function createGitPullButton(onClick, disabled = false) {
  return createButton({
    text: t("button.pull"),
    className: "btn-info",
    identifier: "git-pull",
    onClick,
    disabled,
    ariaLabel: t("aria.pull"),
  });
}

export function createGitDiscardButton(filePath, onClick) {
  return createButton({
    text: t("button.discard"),
    className: "btn-warn btn-discard",
    onClick,
    attributes: {
      title: `Discard changes in ${filePath}`,
    },
  });
}

export function createFlaggedToggleButton(initialFlagged, onClick) {
  const btn = createIconButton({
    iconClass: "fa fa-flag",
    className: initialFlagged ? "btn-flagged" : "btn-unflagged",
    identifier: "form-flagged-toggle",
    ariaLabel: initialFlagged ? t("special.unflag") : t("special.flag"),
  });

  btn._flagged = initialFlagged;

  btn.onclick = () => {
    btn._flagged = !btn._flagged;

    // Toggle classes zonder inhoud te verwijderen
    btn.classList.toggle("btn-flagged", btn._flagged);
    btn.classList.toggle("btn-unflagged", !btn._flagged);

    btn.setAttribute(
      "aria-label",
      btn._flagged ? t("special.unflag") : t("special.flag")
    );

    if (typeof onClick === "function") {
      onClick(btn._flagged);
    }
  };

  return btn;
}

export function createShowMarkdownButton(onClick) {
  return createButton({
    text: t("button.markdown.arrow"),
    className: "modal-header-button",
    identifier: "show-markdown",
    onClick,
  });
}

export function createShowPreviewButton(onClick) {
  return createButton({
    text: t("button.preview.arrow"),
    className: "modal-header-button",
    identifier: "show-preview",
    onClick,
  });
}

export function createCopyMarkdownButton(onClick) {
  return createButton({
    text: t("button.copy"),
    className: "copy-btn",
    identifier: "copy-markdown",
    onClick,
    ariaLabel: t("aria.copyMarkdown"),
  });
}

export function createCopyPreviewButton(onClick) {
  return createButton({
    text: t("button.copy"),
    className: "copy-btn",
    identifier: "copy-preview",
    onClick,
    ariaLabel: t("aria.copyHtml"),
  });
}

export function createPaneCloseButton(targetPaneClass, onClick) {
  return createButton({
    text: t("button.close"),
    className: "btn-close-special",
    identifier: `close-${targetPaneClass}`,
    onClick,
    attributes: { "data-target-pane": targetPaneClass },
  });
}

export function createAddButton({
  label = t("button.add"),
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

export function createAddLoopItemButton(onClick, key, idx = 0) {
  return createButton({
    text: t("button.addLoopItem"),
    className: "btn-okay add-loop-item-btn",
    identifier: "add-loop-item",
    onClick,
  });
}

export function createDeleteLoopItemButton(onClick, identifier = "") {
  return createButton({
    text: t("button.close"),
    className: "btn-close-special btn-danger loop-item-remove",
    identifier: identifier || "loop-item-delete",
    onClick,
  });
}

export function createRemoveImageButton(onClick, identifier = "") {
  return createButton({
    text: t("button.close"),
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
    text: t("button.reloadPlugins"),
    className: "btn-default btn-fullwidth",
    identifier: "reload-plugins",
    onClick,
  });
}

export function createPluginCreateButton(onClick) {
  return createButton({
    text: t("button.createPlugin"),
    className: "btn-okay",
    identifier: "create-plugin",
    onClick,
  });
}

export function createPluginUploadButton(onClick) {
  return createButton({
    text: t("button.uploadPlugin"),
    className: "btn-okay",
    identifier: "upload-plugin",
    onClick,
  });
}

export function createPluginDeleteButton(name, onClick) {
  return createButton({
    text: t("button.delete"),
    className: "btn-danger btn-small",
    identifier: `plugin-delete-${name}`,
    onClick,
    ariaLabel: t("aria.deletePlugin", { name }),
  });
}

export function createPluginToggleButton(name, enabled, onClick) {
  return createButton({
    text: enabled ? t("button.disable") : t("button.enable"),
    className: "btn-small",
    identifier: `plugin-toggle-${name}`,
    onClick,
    ariaLabel: `${
      enabled ? t("button.disable") : t("button.enable")
    } plugin ${name}`,
  });
}
