// renderer.js

// ───── Imports ──────────────────────────────
import { loadLocale, t, translateDOM } from "./utils/i18n.js";
import { EventBus } from "./modules/eventBus.js";
import { exposeGlobalAPI } from "./modules/globalAPI.js";
import { initEventRouter } from "./modules/eventRouter.js";
import {
  initStatusHandler,
  setStatusInfo,
} from "./modules/handlers/statusHandler.js";

import { buildMenu, handleMenuAction } from "./modules/menuManager.js";
import { initTemplateEditor } from "./modules/templateEditor.js";
import { createFormManager } from "./modules/formUI.js";
import { createDropdown } from "./utils/dropdownUtils.js";

import {
  setupProfileModal,
  setupSettingsModal,
  setupWorkspaceModal,
  setupEntryModal,
  setupTemplateModal,
  setupGitModal,
  setupPluginModal,
  setuHelpModal,
  setupAboutModal,
} from "./modules/modalSetup.js";

import {
  createTemplateListManager,
  createStorageListManager,
} from "./modules/sidebarManager.js";

import { createTemplateSelector } from "./utils/templateSelector.js";
import { setContextView } from "./modules/contextManager.js";

import { bindContextDependencies } from "./modules/handlers/contextHandlers.js";
import { bindTemplateDependencies } from "./modules/handlers/templateHandlers.js";
import { bindFormDependencies } from "./modules/handlers/formHandlers.js";
import { bindListDependencies } from "./modules/handlers/listHandlers.js";
import { bindLinkDependencies } from "./modules/handlers/linkHandler.js";

// ───── DOM Ready ──────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[App] DOM loaded.");

  // ── Version injection ──
  const appInfo = await window.getAppInfo?.();
  if (appInfo?.version) {
    const versionedTitle = `${appInfo.name} v${appInfo.version}`;

    document.title = versionedTitle;
    window.electron.window.setTitle?.(versionedTitle);

    const aboutHeader = document.getElementById("about-title");
    if (aboutHeader) aboutHeader.textContent = versionedTitle;
  }

  // ── Global UI State ──
  window.currentSelectedTemplate = null;
  window.currentSelectedTemplateName = null;

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  // ── EventBus Init
  initEventRouter();
  window.EventBus = EventBus;
  console.log("[Renderer] EventBus exposed to DevTools.");

  // ── Plugin API ──
  console.log("[Renderer] Exposing Plugin API...");
  exposeGlobalAPI();

  // ── Emit config stuff and start with translations ──
  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  await loadLocale(config.language || "en");
  translateDOM();

  // ── Menu ──
  buildMenu("app-menu", handleMenuAction);
  initStatusHandler("status-bar");

  // ── Grab DOM Elements ──
  const templateContainer = document.getElementById("template-container");
  const storageContainer = document.getElementById("storage-container");

  if (config?.author_name) {
    setStatusInfo("special.user.profile", {
      i18nEnabled: true,
      args: [config.author_name],
    });
  }

  // ── Modals ──
  const profile = setupProfileModal();
  const settings = setupSettingsModal();
  const workspaceModal = setupWorkspaceModal();
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const gitModal = setupGitModal();
  const pluginModal = setupPluginModal();
  const helpModal = setuHelpModal();
  const aboutModal = setupAboutModal();

  window.openProfileModal = profile.show;
  window.openSettingsModal = settings.show;
  window.openWorkspaceModal = workspaceModal.show;
  window.openGitModal = gitModal.show;
  window.openAboutModal = aboutModal.show;
  window.openHelpModal = helpModal.show;
  window.openPluginModal = pluginModal.show;

  // ── Form System ──
  const formManager = createFormManager("storage-content");
  window.formManager = formManager;

  // ── Template Dropdown ──
  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: t("standard.templates"),
    options: [],
    onChange: async (selectedName) => {
      EventBus.emit("logging:default", [
        "[Dropdown] Changed selection to:",
        selectedName,
      ]);
      await selectTemplate(selectedName); // wired below
    },
    onRefresh: async () => {
      const templates = await new Promise((resolve) => {
        EventBus.emit("template:list", { callback: resolve });
      });

      const options = await Promise.all(
        templates.map(async (name) => {
          const descriptor = await new Promise((resolve) => {
            EventBus.emit("template:descriptor", { name, callback: resolve });
          });
          return {
            value: name,
            label:
              descriptor?.yaml?.name?.trim() || name.replace(/\.yaml$/, ""),
          };
        })
      );

      return options;
    },
  });

  // ── Template Editor ──
  const templateEditor = initTemplateEditor(
    "template-content",
    async (updatedYaml) => {
      let template = window.currentSelectedTemplateName;

      if (!template && updatedYaml?.name) {
        template = `${updatedYaml.name}.yaml`;
        window.currentSelectedTemplateName = template;
        window.currentSelectedTemplate = updatedYaml;
        EventBus.emit("logging:default", [
          "[YamlEditor] Recovered from template name:",
          template,
        ]);
      }

      if (!template) {
        EventBus.emit("logging:warning", [
          "[YamlEditor] No template selected.",
        ]);
        EventBus.emit(
          "status:update",
          `${t("status.save.cannot")}: ${t("status.template.no.selected")}`
        );
        return;
      }

      await new Promise((resolve) => {
        EventBus.emit("template:save", {
          name: template,
          data: updatedYaml,
          callback: resolve,
        });
      });
    }
  );

  // ── Sidebars ──
  window.templateListManager = createTemplateListManager(
    templateModal,
    templateDropdown
  );

  const storageListManager = createStorageListManager(
    formManager,
    entryInputModal
  );

  // ── Template Selection Logic ──
  const { selectTemplate, loadTemplateOptions } = createTemplateSelector({
    templateDropdown,
  });

  // ── Event Handler Binding ──
  bindContextDependencies({
    containers: { templateContainer, storageContainer },
    dropdown: templateDropdown,
  });

  bindTemplateDependencies({
    formManager,
    storageListManager,
    templateEditor,
  });

  bindFormDependencies({
    formManager,
    storageListManager,
  });

  bindListDependencies({
    templateListManager: window.templateListManager,
    storageListManager,
  });

  bindLinkDependencies({
    dropdown: templateDropdown,
    selectTemplate, // pass this!
  });

  // ── Initial Data Load ──
  await Promise.all([
    loadTemplateOptions(),
    window.templateListManager.loadList(),
    templateDropdown.refresh?.() ?? Promise.resolve(),
  ]);

  // ── Force context view BEFORE selection (but no emit yet)
  setContextView(config.context_mode, {
    templateContainer,
    storageContainer,
  });

  // ── Initialize from Config ──
  EventBus.emit("boot:initialize", config);
});
