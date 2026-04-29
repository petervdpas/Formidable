// modules/settingsManager.js

import { EventBus } from "./eventBus.js";
import { makeTab, createTabView } from "../utils/tabUtils.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import {
  createDirectoryPicker,
  createSwitch,
  createFormRowInput,
  addContainerElement,
} from "../utils/elementBuilders.js";
import { createDropdown } from "../utils/dropdownUtils.js";
import { createButton } from "../utils/buttonUtils.js";
import { deriveBackend } from "../utils/backendUtils.js";
import { showFieldGroup } from "../utils/domUtils.js";
import {
  t,
  loadLocale,
  getAvailableLanguages,
  translateDOM,
} from "../utils/i18n.js";
import { reloadUserConfig, invalidateUserConfig } from "../utils/configUtil.js";
import { rebuildMenu } from "../modules/menuManager.js";

let cachedConfig = null;

export async function renderSettings() {
  const container = document.getElementById("settings-body");
  if (!container) return false;

  // Reset cache + reload config
  invalidateUserConfig();
  cachedConfig = await reloadUserConfig();
  const config = cachedConfig;
  let gitRootPicker;

  container.innerHTML = "";

  // ─── General Settings (factory) ─────────────────
  const generalTab = makeTab(
    "general",
    t("modal.settings.tab.general"),
    "modal.settings.tab.general",
    (panel) => {
      // Intro text
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.general.description"),
        i18nKey: "modal.settings.tab.general.description",
      });

      // Profile name (identifies this config profile)
      panel.appendChild(
        bindFormInput(
          "profile-name",
          "profile_name",
          "modal.settings.profile.name"
        )
      );

      // Language dropdown host (setupLanguageDropdown binds to this id)
      const languageRow = document.createElement("div");
      languageRow.id = "settings-language";
      languageRow.className = "modal-form-row";
      panel.appendChild(languageRow);

      // Author
      panel.appendChild(
        bindFormInput(
          "author-name",
          "author_name",
          "modal.settings.author.name"
        )
      );
      panel.appendChild(
        bindFormInput(
          "author-email",
          "author_email",
          "modal.settings.author.email"
        )
      );
    }
  );

  // ─── History Settings (factory) ─────────────────
  const historyTab = makeTab(
    "history",
    t("modal.settings.tab.history"),
    "modal.settings.tab.history",
    (panel) => {
      // Intro text
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.history.description"),
        i18nKey: "modal.settings.tab.history.description",
      });

      panel.appendChild(
        createSwitch(
          "history-enabled",
          "config.history.enabled",
          cachedConfig.history?.enabled ?? true,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "history-persist",
          "config.history.persist",
          cachedConfig.history?.persist ?? false,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        createFormRowInput({
          id: "history-max-size",
          labelOrKey: "config.history.max_size",
          type: "number",
          value: cachedConfig.history?.max_size ?? 20,
          attributes: { min: 1, max: 500, step: 1 },
          // nested -> save manually (keep old behavior)
          configKey: "__history.max_size__",
          onSave: async (val) => {
            const n = Math.max(1, Math.min(500, parseInt(val, 10) || 20));
            const h = cachedConfig.history ?? {};
            await EventBus.emit("config:update", {
              history: { ...h, max_size: n },
            });
            cachedConfig = await reloadUserConfig();
            emitConfigStatus("history.max_size", String(n));
          },
          i18nEnabled: true,
        })
      );
    }
  );

  // ─── Display Settings (factory) ─────────────────
  const displayTab = makeTab(
    "display",
    t("modal.settings.tab.display"),
    "modal.settings.tab.display",
    (panel) => {
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.display.description"),
        i18nKey: "modal.settings.tab.display.description",
      });

      // Theme dropdown host (bound by setupThemeDropdown)
      const themeRow = document.createElement("div");
      themeRow.id = "settings-theme";
      themeRow.className = "modal-form-row";
      panel.appendChild(themeRow);

      panel.appendChild(
        createSwitch(
          "show-expressions-toggle",
          "standard.expressions",
          cachedConfig.use_expressions ?? true,
          null,
          "block",
          ["standard.show", "standard.hide"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "loop-collapse-toggle",
          "modal.settings.display.loop.collapsed",
          cachedConfig.loop_state_collapsed ?? false,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "field-collapse-toggle",
          "modal.settings.display.field.collapsed",
          cachedConfig.field_state_collapsed ?? false,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "show-paste-toggle",
          "modal.settings.paste.buttons",
          cachedConfig.show_paste_buttons ?? true,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "show-meta-toggle",
          "modal.settings.display.meta",
          cachedConfig.show_meta_section ?? true,
          null,
          "block",
          ["standard.show", "standard.hide"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "show-icons-toggle",
          "modal.settings.icon.buttons",
          cachedConfig.show_icon_buttons ?? true,
          null,
          "block",
          ["standard.on.experimental", "standard.off"],
          true
        )
      );
    }
  );

  // ─── Directories & Remote Backend (factory) ─────────────────
  const directoriesTab = makeTab(
    "directories",
    t("modal.settings.tab.directories"),
    "modal.settings.tab.directories",
    (panel) => {
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.directories.description"),
        i18nKey: "modal.settings.tab.directories.description",
      });

      // Context folder picker
      const contextFolderPicker = createDirectoryPicker({
        id: "settings-context-folder",
        label: t("modal.settings.context.folder"),
        value: cachedConfig.context_folder || "./",
        outerClass: "modal-form-row tight-gap",
      });
      panel.appendChild(contextFolderPicker.element);

      // Remote backend dropdown host (bound by setupRemoteBackendDropdown)
      const backendRow = document.createElement("div");
      backendRow.id = "settings-remote-backend";
      backendRow.className = "modal-form-row";
      panel.appendChild(backendRow);

      // Git group — visible when backend === "git"
      const gitGroup = document.createElement("div");
      gitGroup.id = "settings-git-group";
      gitGroup.dataset.fieldGroup = "git";

      gitRootPicker = createDirectoryPicker({
        id: "settings-git-root",
        label: t("modal.settings.git.root"),
        value: cachedConfig.git_root || "",
        outerClass: "modal-form-row tight-gap",
      });
      gitGroup.appendChild(gitRootPicker.element);
      panel.appendChild(gitGroup);

      // GiGot group — visible when backend === "gigot"
      const gigotGroup = document.createElement("div");
      gigotGroup.id = "settings-gigot-group";
      gigotGroup.dataset.fieldGroup = "gigot";

      gigotGroup.appendChild(
        bindFormInput(
          "settings-gigot-base-url",
          "gigot_base_url",
          "modal.settings.gigot.baseUrl"
        )
      );
      gigotGroup.appendChild(
        bindFormInput(
          "settings-gigot-repo-name",
          "gigot_repo_name",
          "modal.settings.gigot.repoName"
        )
      );
      gigotGroup.appendChild(
        createFormRowInput({
          id: "settings-gigot-token",
          labelOrKey: "modal.settings.gigot.token",
          type: "password",
          value: cachedConfig.gigot_token || "",
          configKey: "gigot_token",
          onSave: async (val) => {
            await EventBus.emit("config:update", { gigot_token: val });
            cachedConfig = await reloadUserConfig();
            emitConfigStatus("gigot_token", "•••••");
          },
          i18nEnabled: true,
        })
      );

      // Test connection button
      const testRow = document.createElement("div");
      testRow.className = "modal-form-row tight-gap";
      const testBtn = createButton({
        text: t("modal.settings.gigot.test") || "Test connection",
        i18nKey: "modal.settings.gigot.test",
        identifier: "gigot-test",
      });
      const testOut = document.createElement("span");
      testOut.id = "settings-gigot-test-out";
      testOut.className = "label-subtext";
      testOut.style.marginLeft = "0.75rem";
      testRow.appendChild(testBtn);
      testRow.appendChild(testOut);
      gigotGroup.appendChild(testRow);

      panel.appendChild(gigotGroup);

      // Initial visibility. Pass `panel` as root: at this point the
      // panel is still a detached fragment so document.getElementById
      // can't find the groups yet, but querySelectorAll on panel does.
      showFieldGroup(deriveBackend(cachedConfig), panel);
    }
  );

  // ─── Internal Server (factory) ─────────────────
  const internalTab = makeTab(
    "internal",
    t("modal.settings.tab.internal"),
    "modal.settings.tab.internal",
    (panel) => {
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.internal.description"),
        i18nKey: "modal.settings.tab.internal.description",
      });

      panel.appendChild(
        createSwitch(
          "internal-server-toggle",
          "modal.settings.internal.enabled",
          cachedConfig.enable_internal_server ?? false,
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        )
      );

      panel.appendChild(
        bindFormInput(
          "internal-server-port",
          "internal_server_port",
          "modal.settings.internal.port"
        )
      );
    }
  );

  // ─── Advanced Settings (factory) ─────────────────
  const advancedTab = makeTab(
    "advanced",
    t("modal.settings.tab.advanced"),
    "modal.settings.tab.advanced",
    (panel) => {
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.advanced.description"),
        i18nKey: "modal.settings.tab.advanced.description",
      });

      panel.appendChild(
        createSwitch(
          "plugin-toggle",
          "modal.settings.advanced.plugins.enabled",
          cachedConfig.enable_plugins ?? false,
          null,
          "block",
          ["standard.enabled", "standard.disabled"],
          true
        )
      );

      panel.appendChild(
        createFormRowInput({
          id: "encryption-key",
          labelOrKey: "modal.settings.advanced.secretKey",
          type: "password",
          value: cachedConfig.encryption_key,
          configKey: "encryption_key",
          onSave: async (val) => {
            await EventBus.emit("config:update", { encryption_key: val });
            cachedConfig = await reloadUserConfig();
            emitConfigStatus("encryption_key", "•••••");
          },
          i18nEnabled: true,
        })
      );

      panel.appendChild(
        createSwitch(
          "settings-development-toggle",
          "modal.settings.advanced.developmentMode",
          cachedConfig.development_enable ?? false,
          null,
          "block",
          ["standard.enabled", "standard.disabled"],
          true
        )
      );

      panel.appendChild(
        createSwitch(
          "logging-toggle",
          "modal.settings.advanced.logging.enabled",
          cachedConfig.logging_enabled,
          null,
          "block",
          ["standard.enabled", "standard.disabled"],
          true
        )
      );
    }
  );

  // ─── Status Buttons (factory) ─────────────────
  const statusButtonsTab = makeTab(
    "status-buttons",
    t("modal.settings.tab.statusButtons"),
    "modal.settings.tab.statusButtons",
    (panel) => {
      addContainerElement({
        parent: panel,
        tag: "p",
        className: "form-info-text",
        textContent: t("modal.settings.tab.statusButtons.description"),
        i18nKey: "modal.settings.tab.statusButtons.description",
      });

      const sb = cachedConfig.status_buttons ?? {};
      const keys = Object.keys(sb);

      if (keys.length === 0) {
        addContainerElement({
          parent: panel,
          tag: "p",
          className: "form-info-text",
          textContent: t("modal.settings.tab.statusButtons.empty"),
          i18nKey: "modal.settings.tab.statusButtons.empty",
        });
        return;
      }

      for (const key of keys) {
        const switchId = `status-btn-${key}`;
        const labelKey = `modal.settings.statusButtons.${key}`;

        const sw = createSwitch(
          switchId,
          labelKey,
          !!sb[key],
          null,
          "block",
          ["standard.on", "standard.off"],
          true
        );

        // Special rule: gitquick depends on use_git
        if (key === "gitquick" && cachedConfig.use_git !== true) {
          const input = sw.querySelector('input[type="checkbox"]');
          if (input) input.disabled = true;

          addContainerElement({
            parent: sw,
            tag: "small",
            className: "label-subtext",
            textContent:
              t("modal.settings.statusButtons.gitquick.dependsOnGit") ||
              "Requires Git to be enabled.",
          });
        }

        panel.appendChild(sw);
      }
    }
  );

  // ─── Create vertical tabview from factories ─────
  const tv = createTabView({
    items: [
      generalTab,
      historyTab,
      displayTab,
      directoriesTab,
      internalTab,
      advancedTab,
      statusButtonsTab,
    ],
    vertical: false,
    activeIndex: 0,
    onChange: (i) => {
      EventBus.emit("logging:default", [`[Settings] Switched to tab ${i}`]);
    },
  });

  // Inject into container
  container.appendChild(tv.root);

  // Bind everything after DOM is in place
  setupLanguageDropdown(config);
  setupThemeDropdown(config);
  setupRemoteBackendDropdown(config);
  setupBindings(config, gitRootPicker);

  return tv;
}

function setupBindings(config, gitRootPicker) {
  bindToggleSwitch("show-icons-toggle", "show_icon_buttons");
  bindToggleSwitch("show-paste-toggle", "show_paste_buttons", (enabled) => {
    EventBus.emit("screen:paste:visibility", enabled);
  });
  bindToggleSwitch("show-expressions-toggle", "use_expressions");
  bindToggleSwitch("show-meta-toggle", "show_meta_section", (enabled) => {
    EventBus.emit("screen:meta:visibility", enabled);
  });
  bindToggleSwitch("loop-collapse-toggle", "loop_state_collapsed");
  bindToggleSwitch("field-collapse-toggle", "field_state_collapsed");
  bindToggleSwitch("plugin-toggle", "enable_plugins");
  bindToggleSwitch("settings-development-toggle", "development_enable");
  bindToggleSwitch("logging-toggle", "logging_enabled", (enabled) =>
    EventBus.emit("logging:toggle", enabled)
  );

  bindDirButton("settings-context-folder", "context_folder");
  bindDirButton("settings-git-root", "git_root");
  // Note: gigot_base_url / gigot_repo_name / gigot_token inputs are
  // self-wired by bindFormInput / createFormRowInput at render time.
  // The dropdown itself is bound in setupRemoteBackendDropdown.

  bindToggleSwitch("internal-server-toggle", "enable_internal_server");

  bindStatusButtons(config);

  // ─── History (nested) ───
  bindNestedSwitch("history-enabled", ["history", "enabled"]);
  bindNestedSwitch("history-persist", ["history", "persist"]);
  bindNestedNumber(
    "#history-max-size input",
    ["history", "max_size"],
    (raw) => {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return 20;
      return Math.min(500, Math.max(1, n));
    }
  );

  // ─── Disable dependents when history is off ───
  (() => {
    const persistEl = document.getElementById("history-persist");
    const maxEl = document.querySelector("#history-max-size input");
    const setDisabled = (off) => {
      const cb = persistEl?.matches('input[type="checkbox"]')
        ? persistEl
        : persistEl?.querySelector('input[type="checkbox"]');
      if (cb) cb.disabled = !!off;
      if (maxEl) maxEl.disabled = !!off;
    };
    setDisabled(cachedConfig.history?.enabled === false);

    // hook the enabled toggle to keep this in sync
    const enabledEl = document.getElementById("history-enabled");
    const enabledCb = enabledEl?.matches('input[type="checkbox"]')
      ? enabledEl
      : enabledEl?.querySelector('input[type="checkbox"]');
    if (enabledCb) {
      const orig = enabledCb.onchange;
      enabledCb.onchange = async (e) => {
        if (typeof orig === "function") await orig(e);
        setDisabled(!enabledCb.checked);
      };
    }
  })();
}

async function enforceGitQuickConstraint(useGitEnabled) {
  const input = getSwitchInputById("status-btn-gitquick");
  if (!input) return;

  if (!useGitEnabled) {
    input.disabled = true;

    if (input.checked || cachedConfig.status_buttons?.gitquick === true) {
      input.checked = false;

      const nextStatusButtons = {
        ...(cachedConfig.status_buttons ?? {}),
        gitquick: false,
      };

      await EventBus.emit("config:update", {
        status_buttons: nextStatusButtons,
      });
      cachedConfig = await reloadUserConfig();

      EventBus.emit("status:update", {
        languageKey: "status.config.disabled",
        i18nEnabled: true,
        args: [
          t("modal.settings.statusButtons.gitquick") || "Git Quick Actions",
        ],
        variant: "warning",
      });
    }
  } else {
    input.disabled = false;
  }
}

async function updateNestedConfig(pathArr, value) {
  // pathArr like ["history", "enabled"]
  const [rootKey, leafKey] = pathArr;
  const root = { ...(cachedConfig[rootKey] ?? {}), [leafKey]: value };
  await EventBus.emit("config:update", { [rootKey]: root });
  cachedConfig = await reloadUserConfig();
  emitConfigStatus(`${rootKey}.${leafKey}`, value);
}

function bindThemeSwitch(switchId, configKey) {
  const el = document.getElementById(switchId);
  if (!el) return;

  EventBus.emit("theme:toggle", el.checked ? "dark" : "light");

  el.onchange = async () => {
    const theme = el.checked ? "dark" : "light";
    await EventBus.emit("config:update", { [configKey]: theme });
    cachedConfig = await reloadUserConfig();
    EventBus.emit("theme:toggle", theme);

    emitConfigStatus(configKey, theme);
  };
}

function bindToggleSwitch(switchId, configKey, onExtra = null) {
  const el = document.getElementById(switchId);
  if (!el) return;

  el.onchange = async () => {
    const enabled = el.checked;
    await EventBus.emit("config:update", { [configKey]: enabled });
    if (typeof onExtra === "function") await onExtra(enabled);
    cachedConfig = await reloadUserConfig();

    emitConfigStatus(configKey, enabled);
  };
}

function bindNestedSwitch(switchId, pathArr) {
  const el = document.getElementById(switchId);
  if (!el) return;
  const input = el.matches('input[type="checkbox"]')
    ? el
    : el.querySelector('input[type="checkbox"]');
  if (!input) return;
  input.onchange = async () => {
    await updateNestedConfig(pathArr, !!input.checked);
  };
}

function bindFormInput(id, configKey, key) {
  return createFormRowInput({
    id,
    labelOrKey: key,
    value: cachedConfig[configKey],
    configKey,
    onSave: async (val) => {
      EventBus.emit("config:update", { [configKey]: val });
      cachedConfig = await reloadUserConfig();
      emitConfigStatus(configKey, val);
    },
    i18nEnabled: true,
  });
}

function bindNestedNumber(inputSelector, pathArr, coerce) {
  const input =
    document.querySelector(inputSelector) ||
    document.getElementById(inputSelector.replace("#", ""));
  if (!input) return;
  input.onchange = async () => {
    const v = coerce ? coerce(input.value) : Number(input.value);
    input.value = String(v);
    await updateNestedConfig(pathArr, v);
  };
}

function bindDirButton(fieldId, configKey) {
  const input = document.getElementById(fieldId);
  const button = document.getElementById(`choose-${fieldId}`);
  if (!input || !button) return;

  button.onclick = async () => {
    const selected = await window.api.dialog.chooseDirectory();
    if (!selected) return;

    const appRoot = (await window.api.system.getAppRoot?.()) || ".";
    const relative = formatAsRelativePath(selected, appRoot);

    input.value = relative;
    await EventBus.emit("config:update", { [configKey]: relative });
    cachedConfig = await reloadUserConfig();

    emitConfigStatus(configKey, relative);
  };
}

function bindStatusButtons(config) {
  const sb = config.status_buttons ?? {};
  for (const key of Object.keys(sb)) {
    const switchId = `status-btn-${key}`;
    const input = getSwitchInputById(switchId);
    if (!input) continue;

    input.onchange = async () => {
      if (key === "gitquick" && cachedConfig?.use_git !== true) {
        input.checked = false;
        await enforceGitQuickConstraint(false);
        return;
      }

      const enabled = !!input.checked;
      const nextStatusButtons = {
        ...(cachedConfig.status_buttons ?? {}),
        [key]: enabled,
      };

      await EventBus.emit("config:update", {
        status_buttons: nextStatusButtons,
      });
      cachedConfig = await reloadUserConfig();

      const label = t(`modal.settings.statusButtons.${key}`) || key;
      EventBus.emit("status:update", {
        languageKey: enabled
          ? "status.config.enabled"
          : "status.config.disabled",
        i18nEnabled: true,
        args: [label],
        variant: enabled ? "default" : "warning",
      });

      EventBus.emit?.("statusButtons:toggle", { id: key, enabled });
    };
  }

  enforceGitQuickConstraint(cachedConfig?.use_git === true);
}

function setupRemoteBackendDropdown(config) {
  createDropdown({
    containerId: "settings-remote-backend",
    labelTextOrKey: "modal.settings.remote.backend",
    selectedValue: deriveBackend(config),
    options: [
      {
        value: "none",
        label: t("modal.settings.remote.backend.none") || "None (local only)",
      },
      {
        value: "git",
        label: t("modal.settings.remote.backend.git") || "Git",
      },
      {
        value: "gigot",
        label: t("modal.settings.remote.backend.gigot") || "GiGot",
      },
    ],
    onChange: async (value) => {
      // Legacy `use_git` is still read by status-buttons (gitquick) and
      // the config schema defaults. Keep it in lockstep with the new
      // dropdown until those callers migrate to deriveBackend().
      await EventBus.emit("config:update", {
        remote_backend: value,
        use_git: value === "git",
      });
      cachedConfig = await reloadUserConfig();
      showFieldGroup(value);
      await enforceGitQuickConstraint(value === "git");
      await rebuildMenu();
      emitConfigStatus("remote_backend", value);
    },
    i18nEnabled: true,
  });

  // Wire the Test-connection button. Reads *live* input values so
  // unsaved keystrokes are included in the probe.
  const btn = document.getElementById("btn-gigot-test");
  const out = document.getElementById("settings-gigot-test-out");
  if (!btn || !out) return;

  btn.onclick = async () => {
    const baseUrl = (
      document.getElementById("settings-gigot-base-url")?.value || ""
    ).trim();
    const repoName = (
      document.getElementById("settings-gigot-repo-name")?.value || ""
    ).trim();
    const token =
      document.getElementById("settings-gigot-token")?.value || "";

    out.textContent = t("modal.settings.gigot.test.running") || "…";
    out.style.color = "";
    btn.disabled = true;

    await new Promise((resolve) => {
      EventBus.emit("gigot:status", {
        conn: { baseUrl, token, repoName },
        callback: (res) => {
          btn.disabled = false;
          if (res?.ok) {
            out.textContent =
              t("modal.settings.gigot.test.ok") || "Connected";
            out.style.color = "var(--color-success, green)";
          } else {
            const prefix =
              t("modal.settings.gigot.test.fail") || "Failed";
            out.textContent = `${prefix}: ${res?.error || "unknown"}`;
            out.style.color = "var(--color-error, crimson)";
          }
          resolve();
        },
      });
    });
  };
}

function setupLanguageDropdown(config) {
  createDropdown({
    containerId: "settings-language",
    labelTextOrKey: "modal.settings.author.language",
    selectedValue: config.language || "en",
    options: getAvailableLanguages(),
    onChange: async (value) => {
      // Persist
      await EventBus.emit("config:update", { language: value });
      cachedConfig = await reloadUserConfig();

      // Load & apply translations immediately
      try {
        await loadLocale(value);
        translateDOM();
        await rebuildMenu();

        EventBus.emit("status:update", {
          languageKey: `status.language.set.${value}`,
          i18nEnabled: true,
        });
      } catch (err) {
        EventBus.emit("status:update", {
          languageKey: `status.language.set.fail.${value}`,
          i18nEnabled: true,
          args: [err.message],
          log: true,
          logLevel: "error",
          logOrigin: "settingsManager:setupLanguageDropdown",
        });
      }
    },
    i18nEnabled: true,
  });
}

function setupThemeDropdown(config) {
  // keep whatever loader you use in renderer: applyThemeLinks(theme)
  createDropdown({
    containerId: "settings-theme",
    labelTextOrKey: "modal.settings.display.theme",
    selectedValue: (config.theme || "light").toLowerCase(),
    options: [
      { value: "light", label: t("modal.settings.display.theme.light") || "Light" },
      { value: "dark",  label: t("modal.settings.display.theme.dark")  || "Dark"  },
      { value: "purplish", label: t("modal.settings.display.theme.purplish") || "Purplish" }
    ],
    onChange: async (theme) => {
      // persist
      await EventBus.emit("config:update", { theme });
      cachedConfig = await reloadUserConfig();

      // apply immediately
      EventBus.emit("theme:toggle", theme);

      // status toast
      emitConfigStatus("theme", theme);
    },
    i18nEnabled: true,
  });
}
function emitConfigStatus(configKey, value, success = true) {
  const labelKey = `config.${configKey}`;
  const label = t(labelKey);

  if (success === false) {
    EventBus.emit("status:update", {
      message: `${configKey} update failed`,
      languageKey: "status.config.failed",
      i18nEnabled: true,
      args: [label],
      variant: "error",
    });
    return;
  }

  // ── Theme-specific message ──
  if (configKey === "theme" && (value === "dark" || value === "light")) {
    // Special handling for theme changes happens in themeHandler.js
    return;
  }

  if (typeof value === "boolean") {
    const statusKey = value
      ? "status.config.enabled"
      : "status.config.disabled";
    EventBus.emit("status:update", {
      message: `${configKey} ${value ? "enabled" : "disabled"}`,
      languageKey: statusKey,
      i18nEnabled: true,
      args: [label],
      variant: value ? "default" : "warning",
    });
  } else {
    EventBus.emit("status:update", {
      message: `${configKey} set to ${value}`,
      languageKey: "status.basic.setTo",
      i18nEnabled: true,
      args: [label, value],
    });
  }
}

function getSwitchInputById(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.matches('input[type="checkbox"]')
    ? el
    : el.querySelector('input[type="checkbox"]');
}
