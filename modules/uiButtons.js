// modules/uiButtons.js

import {
  createStatusButtonConfig,
  createButton,
  createIconButton,
} from "../utils/buttonUtils.js";
import { t } from "../utils/i18n.js";

export function createStatusCharPickerButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-charpicker-btn",
    label: "Ω",
    titleKey: "tooltip.characterPicker",
    ariaKey: "aria.characterPicker",
    className: "btn-charpicker",
    onClick,
  });
}

export function createSettingsRestartIconButton(
  handleClick,
  isDisabled = false
) {
  return createIconButton({
    iconClass: "fa fa-refresh",
    className: "btn-icon btn-icon-default btn-icon-small",
    identifier: "settings-restart",
    onClick: handleClick,
    disabled: isDisabled,
    i18nTitle: "tooltip.restart.formidable",
    i18nAria: "aria.restartApp",
  });
}

export function createProfileAddButton(onClick) {
  return createButton({
    text: t("standard.create"),
    i18nKey: "standard.create",
    className: "btn-info",
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
    ariaLabel: t("standard.edit"),
  });
}

export function createFieldEditButton(idx, onClick) {
  return createButton({
    text: t("standard.edit"),
    i18nKey: "standard.edit",
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
    ariaLabel: t("standard.delete"),
  });
}

export function createFieldDeleteButton(idx, onClick) {
  return createButton({
    text: t("standard.delete"),
    i18nKey: "standard.delete",
    className: "btn-danger",
    identifier: `field-delete-${idx}`,
    onClick,
    attributes: { "data-idx": idx, "data-action": "delete" },
  });
}

export function createReorderUpButton(idx, disabled, onClick) {
  return createButton({
    text: t("standard.up.sign"),
    i18nKey: "standard.up.sign",
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
    text: t("standard.down.sign"),
    i18nKey: "standard.down.sign",
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
    i18nKey: "button.addField",
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
    ariaLabel: t("standard.save"),
  });
}

export function createTemplateSaveButton(onClick) {
  return createButton({
    text: t("standard.save"),
    i18nKey: "standard.save",
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
    ariaLabel: t("standard.delete"),
  });
}

export function createTemplateDeleteButton(onClick) {
  return createButton({
    text: t("standard.delete"),
    i18nKey: "standard.delete",
    className: "btn-default btn-danger",
    identifier: "template-delete",
    onClick,
  });
}

export function createTemplateGeneratorButton(onClick) {
  return createButton({
    text: t("button.generateTemplate"),
    i18nKey: "button.generateTemplate",
    className: "btn-default btn-info",
    identifier: "template-generate",
    onClick,
  });
}

export function createFormSaveButton(onClick) {
  return createButton({
    text: t("standard.save"),
    i18nKey: "standard.save",
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
    ariaLabel: t("standard.save"),
  });
}

export function createFormDeleteButton(onClick) {
  return createButton({
    text: t("standard.delete"),
    i18nKey: "standard.delete",
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
    ariaLabel: t("standard.delete"),
  });
}

export function createFormRenderButton(onClick) {
  return createButton({
    text: t("standard.render"),
    i18nKey: "standard.render",
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
    ariaLabel: t("standard.render"),
  });
}

export function createGitCommitButton(onClick, disabled = false) {
  return createButton({
    text: t("standard.commit"),
    i18nKey: "standard.commit",
    className: "btn-info",
    identifier: "git-commit",
    onClick,
    disabled,
    ariaLabel: t("aria.commit"),
  });
}

export function createGitPushButton(onClick, disabled = false) {
  return createButton({
    text: t("standard.push"),
    i18nKey: "standard.push",
    className: "btn-info",
    identifier: "git-push",
    onClick,
    disabled,
    ariaLabel: t("aria.push"),
  });
}

export function createGitPullButton(onClick, disabled = false) {
  return createButton({
    text: t("standard.pull"),
    i18nKey: "standard.pull",
    className: "btn-info",
    identifier: "git-pull",
    onClick,
    disabled,
    ariaLabel: t("aria.pull"),
  });
}

export function createGitDiscardButton(filePath, onClick) {
  return createButton({
    text: t("standard.discard"),
    i18nKey: "standard.discard",
    className: "btn-warn btn-discard",
    onClick,
    attributes: {
      title: `Discard changes in ${filePath}`,
    },
  });
}

export function createFlaggedToggleButton(initialFlagged, onClick) {
  const i18nFlag = "standard.flag";
  const i18nUnflag = "standard.unflag";

  const btn = createIconButton({
    iconClass: "fa fa-flag",
    className: initialFlagged ? "btn-flagged" : "btn-unflagged",
    identifier: "form-flagged-toggle",
    i18nAria: initialFlagged ? i18nUnflag : i18nFlag,
  });

  // Store both keys for toggling
  btn._flagged = initialFlagged;
  btn._i18nFlag = i18nFlag;
  btn._i18nUnflag = i18nUnflag;

  btn.onclick = () => {
    btn._flagged = !btn._flagged;

    // Toggle class
    btn.classList.toggle("btn-flagged", btn._flagged);
    btn.classList.toggle("btn-unflagged", !btn._flagged);

    // Update aria-label + data-i18n-aria
    const key = btn._flagged ? btn._i18nUnflag : btn._i18nFlag;
    const label = t(key);

    btn.setAttribute("aria-label", label);
    btn.setAttribute("data-i18n-aria", key);

    if (typeof onClick === "function") {
      onClick(btn._flagged);
    }
  };

  return btn;
}

export function createShowMarkdownButton(onClick) {
  return createButton({
    text: t("button.markdown.arrow"),
    i18nKey: "button.markdown.arrow",
    className: "modal-header-button",
    identifier: "show-markdown",
    onClick,
  });
}

export function createShowPreviewButton(onClick) {
  return createButton({
    text: t("button.preview.arrow"),
    i18nKey: "button.preview.arrow",
    className: "modal-header-button",
    identifier: "show-preview",
    onClick,
  });
}

export function createCopyMarkdownButton(onClick) {
  return createButton({
    text: t("standard.copy.sign"),
    i18nKey: "standard.copy.sign",
    className: "copy-btn",
    identifier: "copy-markdown",
    onClick,
    ariaLabel: t("aria.copyMarkdown"),
  });
}

export function createCopyPreviewButton(onClick) {
  return createButton({
    text: t("standard.copy.sign"),
    i18nKey: "standard.copy.sign",
    className: "copy-btn",
    identifier: "copy-preview",
    onClick,
    ariaLabel: t("aria.copyHtml"),
  });
}

export function createPaneCloseButton(targetPaneClass, onClick) {
  return createButton({
    text: t("standard.close.sign"),
    i18nKey: "standard.close.sign",
    className: "btn-close-special",
    identifier: `close-${targetPaneClass}`,
    onClick,
    attributes: { "data-target-pane": targetPaneClass },
  });
}

export function createAddButton({
  label = t("standard.add"),
  i18nKey = "standard.add",
  onClick,
  id = "",
  className = "btn-okay",
}) {
  return createButton({
    text: label,
    i18nKey,
    className,
    identifier: id || label.toLowerCase().replace(/\s+/g, "-"),
    onClick,
  });
}

export function createAddLoopItemButton(onClick, key, idx = 0) {
  return createButton({
    text: t("button.addLoopItem"),
    i18nKey: "button.addLoopItem",
    className: "btn-okay add-loop-item-btn",
    identifier: "add-loop-item",
    onClick,
  });
}

export function createDeleteLoopItemButton(onClick, identifier = "") {
  return createButton({
    text: t("standard.close.sign"),
    i18nKey: "standard.close.sign",
    className: "btn-close-special btn-danger loop-item-remove",
    identifier: identifier || "loop-item-delete",
    onClick,
  });
}

export function createRemoveImageButton(onClick, identifier = "") {
  return createButton({
    text: t("standard.close.sign"),
    i18nKey: "standard.close.sign",
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
    i18nKey: "button.reloadPlugins",
    className: "btn-default btn-fullwidth",
    identifier: "reload-plugins",
    onClick,
  });
}

export function createPluginCreateButton(onClick) {
  return createButton({
    text: t("button.createPlugin"),
    i18nKey: "button.createPlugin",
    className: "btn-okay",
    identifier: "create-plugin",
    onClick,
  });
}

export function createPluginUploadButton(onClick) {
  return createButton({
    text: t("button.uploadPlugin"),
    i18nKey: "button.uploadPlugin",
    className: "btn-okay",
    identifier: "upload-plugin",
    onClick,
  });
}

export function createPluginDeleteButton(name, onClick) {
  return createButton({
    text: t("standard.delete"),
    i18nKey: "standard.delete",
    className: "btn-danger btn-small",
    identifier: `plugin-delete-${name}`,
    onClick,
    ariaLabel: t("aria.deletePlugin", { name }),
  });
}

export function createPluginToggleButton(name, enabled, onClick) {
  return createButton({
    text: enabled ? t("standard.disable") : t("standard.enable"),
    i18nKey: enabled ? "standard.disable" : "standard.enable",
    className: "btn-small",
    identifier: `plugin-toggle-${name}`,
    onClick,
    ariaLabel: `${
      enabled ? t("standard.disable") : t("standard.enable")
    } plugin ${name}`,
  });
}

// --- Loop toolbar builder (collapse/expand all) ---
export function createLoopToolbar(loopList, { asIcons = true } = {}) {
  const toolbar = document.createElement("div");
  toolbar.className = "loop-toolbar";

  const collapseHandler = () => {
    loopList.querySelectorAll(":scope > .loop-item")
      .forEach(it => it.classList.add("collapsed"));
  };
  const expandHandler = () => {
    loopList.querySelectorAll(":scope > .loop-item")
      .forEach(it => it.classList.remove("collapsed"));
  };

  const collapseBtn = asIcons
    ? createIconButton({
        iconClass: "fa fa-chevron-up",
        className: "btn icon-button btn-icon-default btn-icon-small",
        identifier: "loop-collapse-all",
        onClick: collapseHandler,
        i18nTitle: "standard.collapse_all",  // tooltip
        i18nAria:  "standard.collapse_all",  // screen readers
      })
    : createButton({
        text: t("standard.collapse_all"),
        i18nKey: "standard.collapse_all",
        className: "btn-default btn-small",
        identifier: "loop-collapse-all",
        onClick: collapseHandler,
      });

  const expandBtn = asIcons
    ? createIconButton({
        iconClass: "fa fa-chevron-down",
        className: "btn icon-button btn-icon-default btn-icon-small",
        identifier: "loop-expand-all",
        onClick: expandHandler,
        i18nTitle: "standard.expand_all",
        i18nAria:  "standard.expand_all",
      })
    : createButton({
        text: t("standard.expand_all"),
        i18nKey: "standard.expand_all",
        className: "btn-default btn-small",
        identifier: "loop-expand-all",
        onClick: expandHandler,
      });

  toolbar.appendChild(collapseBtn);
  toolbar.appendChild(expandBtn);
  return toolbar;
}