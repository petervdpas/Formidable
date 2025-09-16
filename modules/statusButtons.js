// modules/statusButtons.js
import { t } from "../utils/i18n.js";
import { setupPopup } from "../utils/modalUtils.js";
import { SelectionStore } from "../utils/selectionStore.js";
import {
  createOptionGrid,
  createOptionList,
} from "../utils/elementBuilders.js";
import { allCharacters, toGridOptions } from "../utils/characterUtils.js";
import { createStatusButtonConfig } from "../utils/buttonUtils.js";

// --- button configs (text-label style) ---
function createStatusCharPickerButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-charpicker-btn",
    label: "Ω",
    titleKey: "status.buttonBar.tooltip.characterPicker",
    ariaKey: "status.buttonBar.aria.characterPicker",
    className: "btn-charpicker",
    onClick,
  });
}
function createStatusGitQuickButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-gitquick-btn",
    label: "⎇",
    titleKey: "status.buttonBar.tooltip.gitQuick",
    ariaKey: "status.buttonBar.aria.gitQuick",
    className: "btn-gitquick",
    onClick,
  });
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

function installCharPickerButton({ addStatusButton, EventBus }) {
  addStatusButton(
    createStatusCharPickerButtonConfig((e, btnEl) => {
      // keep editor focus
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

function installGitQuickButton({ addStatusButton, EventBus }) {
  addStatusButton(
    createStatusGitQuickButtonConfig((e, btnEl) => {
      const options = [
        {
          value: "stage_all",
          label: t("git.quick.stage_all") || "Stage all",
          iconHTML: `<i class="fa fa-plus-square"></i>`,
        },
        {
          value: "commit",
          label: t("git.quick.commit") || "Commit…",
          iconHTML: `<i class="fa fa-check"></i>`,
        },
        {
          value: "open_full",
          label: t("git.quick.open_full") || "Open Git…",
          iconHTML: `<i class="fa fa-external-link-alt"></i>`,
        },
      ];
      const list = createOptionList(
        options,
        (val) => {
          switch (val) {
            case "stage_all":
              EventBus.emit("git:stage:all", { callback: () => {} });
              break;
            case "commit":
            case "open_full":
              window.openGitModal?.();
              break;
          }
          activePopup?.hide?.();
        },
        { className: "gitq-actions", ariaLabel: "Git quick actions" }
      );
      openSharedPopup(btnEl, list);
    })
  );
}

// optional aggregator
export function installStatusButtons(deps) {
  installCharPickerButton(deps);
  installGitQuickButton(deps);
}
