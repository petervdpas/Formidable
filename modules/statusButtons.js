// modules/statusButtons.js
import { t } from "../utils/i18n.js";
import { setupPopup } from "../utils/modalUtils.js";
import { SelectionStore } from "../utils/selectionStore.js";
import {
  createOptionGrid,
  createOptionPanel,
} from "../utils/elementBuilders.js";
import { allCharacters, toGridOptions } from "../utils/characterUtils.js";
import { createStatusButtonConfig } from "../utils/buttonUtils.js";
import { Toast } from "../utils/toastUtils.js";
import {
  loadConfig,
  resolveGitPath,
  getStatus,
  getProgressState,
  commit as gitCommit,
  push as gitPush,
  GitRules,
} from "../utils/gitUtils.js";

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

// Helpers
function getFlag(cfg, path, fallback = true) {
  const val = path
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), cfg);
  return typeof val === "boolean" ? val : fallback;
}

function installActionButton(
  { addStatusButton, config },
  {
    flagKey,
    id,
    labelKey,
    fallbackLabel,
    iconClass,
    titleKey,
    ariaKey,
    className,
    action,
  }
) {
  if (!getFlag(config, flagKey, true)) return null;
  const cfg = createStatusButtonConfig({
    id,
    label: t(labelKey) || fallbackLabel,
    iconClass,
    titleKey,
    ariaKey,
    className,
    onClick: action,
  });
  return addStatusButton(cfg);
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

function createStatusReloadButtonConfig(onClick) {
  return createStatusButtonConfig({
    id: "status-reload-btn",
    label: t("status.buttonBar.aria.reload") || "Reload",
    iconClass: "fa fa-refresh",
    titleKey: "status.buttonBar.tooltip.reload",
    ariaKey: "status.buttonBar.aria.reload",
    className: "btn-reload",
    onClick,
  });
}

// ===================== installers =====================
function installReloadButton(deps) {
  if (!getFlag(deps.config, "status_buttons.reloader", true)) return null;
  return installActionButton(deps, {
    flagKey: "status_buttons.reload",
    id: "status-reload-btn",
    labelKey: "status.buttonBar.aria.reload",
    fallbackLabel: "Reload",
    iconClass: "fa fa-refresh",
    titleKey: "status.buttonBar.tooltip.reload",
    ariaKey: "status.buttonBar.aria.reload",
    className: "btn-reload",
    action: () => window.location.reload(),
  });
}

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
            Toast.success("toast.copy.clipboard", [val]);
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

  const gitPathPromise = (async () => {
    const cfg = await loadConfig();
    return resolveGitPath(cfg) || null;
  })();

  const setDisabled = (btn, disabled) => {
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.setAttribute("aria-disabled", String(!!disabled));
  };

  const setPushVisual = (btn, canPush) => {
    if (!btn) return;
    btn.classList.toggle("is-success", !!canPush);
  };

  return addStatusButton(
    createStatusGitQuickButtonConfig(async (e, btnEl) => {
      const gitPath = await gitPathPromise;
      if (!gitPath) {
        window.openGitModal?.();
        return;
      }

      let status = await getStatus(gitPath).catch(() => null);
      let progress = await getProgressState(gitPath).catch(() => null);
      let message = "";

      const recompute = (commitBtn, pushBtn, msgEl) => {
        message = (msgEl?.value || "").trim();
        const ev = GitRules.evaluate({
          status,
          progress,
          message,
          strictPush: true,
        });

        setDisabled(commitBtn, !ev.canCommit);
        setDisabled(pushBtn, !ev.canPush);
        setPushVisual(pushBtn, ev.canPush);
      };

      const refreshFromRepo = async (commitBtn, pushBtn, msgEl) => {
        const [s, p] = await Promise.all([
          getStatus(gitPath).catch(() => null),
          getProgressState(gitPath).catch(() => null),
        ]);
        if (s) status = s;
        if (p) progress = p;
        recompute(commitBtn, pushBtn, msgEl);
      };

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
              value: "commit",
              label: t("git.quick.commit") || "Commit…",
              variant: "primary",
              attributes: { "aria-disabled": "true" },
            },
            {
              value: "push",
              label: t("git.push") || "Push",
              variant: "default",
              attributes: {
                "aria-disabled": "true",
                "data-variant": "okay",
              },
            },
            {
              value: "open_full",
              label: t("git.quick.open_full") || "Open Git…",
              variant: "info",
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
            case "commit": {
              const ev = GitRules.evaluate({
                status,
                progress,
                message: msg,
                strictPush: true,
              });
              if (!ev.canCommit) return;
              try {
                await gitCommit(gitPath, msg);
                Toast.success("toast.git.commit.complete");
                ctx.inputs.commitMsg.value = "";
                await refreshFromRepo(commitBtn, pushBtn, ctx.inputs.commitMsg);
              } catch {
                // backend may toast errors already
              } finally {
                EventBus.emit("status:update", { scope: "git" });
              }
              activePopup?.hide?.();
              break;
            }

            case "push": {
              const ev = GitRules.evaluate({
                status,
                progress,
                message: msg,
                strictPush: true,
              });
              if (!ev.canPush) return;
              try {
                await gitPush(gitPath);
                Toast.success("toast.git.push.complete");
                await refreshFromRepo(commitBtn, pushBtn, ctx.inputs.commitMsg);
              } catch {
                // backend may toast errors already
              } finally {
                EventBus.emit("status:update", { scope: "git" });
              }
              activePopup?.hide?.();
              break;
            }

            case "open_full":
              window.openGitModal?.();
              activePopup?.hide?.();
              break;

            case "cancel":
              activePopup?.hide?.();
              break;
          }
        }
      );

      const msgEl = panel.inputs.commitMsg;
      const commitBtn =
        panel.element.querySelector('button[data-value="commit"]') ||
        panel.element.querySelector('button[value="commit"]');
      const pushBtn =
        panel.element.querySelector('button[data-value="push"]') ||
        panel.element.querySelector('button[value="push"]');

      recompute(commitBtn, pushBtn, msgEl);

      msgEl?.addEventListener("input", () =>
        recompute(commitBtn, pushBtn, msgEl)
      );

      const off = EventBus.on("status:update", async (evt) => {
        if (evt?.scope === "git") {
          await refreshFromRepo(commitBtn, pushBtn, msgEl);
        }
      });

      openSharedPopup(e?.currentTarget || btnEl, panel.element, {
        onClose: () => off?.(),
      });
      panel.focusFirstInput?.();
    })
  );
}

export function installStatusButtons(deps) {
  const charBtn = installCharPickerButton(deps);
  const gitBtn = installGitQuickButton(deps);
  const reloadBtn = installReloadButton(deps);
  return { charBtn, gitBtn, reloadBtn };
}
