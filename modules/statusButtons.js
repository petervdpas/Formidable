// modules/statusButtons.js
import { t } from "../utils/i18n.js";
import { setupPopup } from "../utils/modalUtils.js";
import { SelectionStore } from "../utils/selectionStore.js";
import {
  // createOptionList,
  createOptionGrid,
  createOptionPanel,
} from "../utils/elementBuilders.js";
import { allCharacters, toGridOptions } from "../utils/characterUtils.js";
import { createStatusButtonConfig } from "../utils/buttonUtils.js";

// --- button configs (text-label style) ---
function createStatusCharPickerButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-charpicker-btn",
    label: t("status.buttonBar.aria.characterPicker") || "Character picker",
    iconClass: "fa fa-i-cursor",
    titleKey: "status.buttonBar.tooltip.characterPicker",
    ariaKey: "status.buttonBar.aria.characterPicker",
    className: "btn-charpicker",
    onClick,
  });
}
function createStatusGitQuickButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-gitquick-btn",
    label: t("status.buttonBar.aria.gitQuick") || "Git quick actions",
    iconClass: "fa fa-code-fork",
    titleKey: "status.buttonBar.tooltip.gitQuick",
    ariaKey: "status.buttonBar.aria.gitQuick",
    className: "btn-gitquick",
    onClick,
  });
}

function getFlag(cfg, path, fallback = true) {
  const val = path
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), cfg);
  return typeof val === "boolean" ? val : fallback;
}

// --- shared: reuse the same popup host and avoid duplicates ---
let activePopup = null;
function openSharedPopup(triggerBtn, node, { onClose } = {}) {
  activePopup?.hide?.();
  const popup = setupPopup("status-button-popup", {
    triggerBtn,
    escToClose: true,
    position: "above",
    onClose,
  });
  popup.popup.replaceChildren(node);
  popup.show();
  activePopup = popup;
  return popup;
}

// ===================== installers =====================
function installCharPickerButton({ addStatusButton, EventBus, config }) {
  if (!getFlag(config, "status_buttons.charpicker", true)) return null;

  return addStatusButton(
    createStatusCharPickerButtonConfig((e, btnEl) => {
      SelectionStore.attachTriggerKeepingFocus(btnEl, () => {});
      const grid = createOptionGrid(
        toGridOptions(allCharacters),
        (val) => {
          const ok = SelectionStore.insertText(val);
          if (!ok) {
            navigator.clipboard.writeText(val).catch(() => {});
            EventBus.emit("ui:toast", {
              languageKey: "toast.copy.clipboard",
              args: [val],
              variant: "success",
            });
          }
          activePopup?.hide?.();
        },
        { gridCols: 16, gridRows: 8, cellSize: 32, gridGap: 2 }
      );
      SelectionStore.preventPopupFocusSteal(grid);
      grid
        .querySelectorAll("button.popup-option")
        .forEach((b) => (b.tabIndex = -1));
      openSharedPopup(btnEl, grid, { onClose: () => SelectionStore.clear() });
    })
  );
}

function installGitQuickButton({ addStatusButton, EventBus, config }) {
  if (!getFlag(config, "status_buttons.gitquick", true)) return null;

  return addStatusButton(
    createStatusGitQuickButtonConfig((e, btnEl) => {
      const panel = createOptionPanel(
        {
          title: t("git.quick.title") || "Quick Commit",
          message:
            t("git.quick.subtitle") ||
            "Write a commit message and choose an action.",
          inputs: [
            {
              id: "commitMsg",
              kind: "textarea",
              placeholder: t("git.quick.placeholder") || "Commit message…",
              rows: 4,
            },
          ],
          actions: [
            {
              value: "stage_all",
              label: t("git.quick.stage_all") || "Stage all",
            },
            {
              value: "commit",
              label: t("git.quick.commit") || "Commit",
              variant: "primary",
            },
            {
              value: "commit_push",
              label: t("git.quick.commit_push") || "Commit & Push",
              variant: "primary",
            },
            {
              value: "cancel",
              label: t("standard.cancel") || "Cancel",
              variant: "quiet",
            },
          ],
        },
        async (val, ctx) => {
          const msg = ctx.inputs.commitMsg?.value?.trim() || "";
          switch (val) {
            case "stage_all":
              await new Promise((r) =>
                EventBus.emit("git:stage:all", { callback: r })
              );
              break;
            case "commit":
              if (!msg) {
                EventBus.emit("ui:toast", {
                  languageKey: "git.quick.need_message",
                  variant: "warning",
                  i18nEnabled: true,
                });
                return;
              }
              await new Promise((r) =>
                EventBus.emit("git:commit", { message: msg, callback: r })
              );
              activePopup?.hide?.();
              break;
            case "commit_push":
              if (!msg) {
                EventBus.emit("ui:toast", {
                  languageKey: "git.quick.need_message",
                  variant: "warning",
                  i18nEnabled: true,
                });
                return;
              }
              await new Promise((r) =>
                EventBus.emit("git:commit", { message: msg, callback: r })
              );
              await new Promise((r) =>
                EventBus.emit("git:push", { callback: r })
              );
              activePopup?.hide?.();
              break;
            case "cancel":
              activePopup?.hide?.();
              return;
          }
        }
      );

      const p = openSharedPopup(btnEl, panel.element);
      panel.focusFirstInput?.();
    })
  );
}

// optional aggregator
export function installStatusButtons(deps) {
  const charBtn = installCharPickerButton(deps);
  const gitBtn = installGitQuickButton(deps);
  return { charBtn, gitBtn };
}
