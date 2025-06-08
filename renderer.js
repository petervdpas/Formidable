// renderer.js

// ───── Imports ──────────────────────────────
import { EventBus } from "./modules/eventBus.js";
import { initEventRouter } from "./modules/eventRouter.js";
import { initStatusHandler } from "./modules/handlers/statusHandler.js";

import { buildMenu, handleMenuAction } from "./modules/menuManager.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initTemplateEditor } from "./modules/templateEditor.js";
import { createFormManager } from "./modules/formUI.js";

import {
  setupSettingsModal,
  setupWorkspaceModal,
  setupEntryModal,
  setupTemplateModal,
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

  // ── Menu ──
  buildMenu("app-menu", handleMenuAction);
  initStatusHandler("status-bar");

  // ── Grab DOM Elements ──
  const templateContainer = document.getElementById("template-container");
  const storageContainer = document.getElementById("storage-container");

  // ── Emit config stuff ──
  const config = await window.api.config.loadUserConfig();

  // ── Modals ──
  const settings = setupSettingsModal();
  const workspaceModal = setupWorkspaceModal();
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const aboutModal = setupAboutModal();

  window.openSettingsModal = settings.show;
  window.openWorkspaceModal = workspaceModal.show;
  window.openAboutModal = aboutModal.show;

  // ── Form System ──
  const formManager = createFormManager("storage-content");
  window.formManager = formManager;

  // ── Template Dropdown ──
  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: "Template",
    options: [],
    onChange: async (selectedName) => {
      EventBus.emit("logging:default", [
        "[Dropdown] Changed selection to:",
        selectedName,
      ]);
      await selectTemplate(selectedName); // wired below
    },
    onRefresh: async () => {
      const templates = await window.api.templates.listTemplates();
      return templates.map((name) => ({
        value: name,
        label: name.replace(/\.yaml$/, ""),
      }));
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
        EventBus.emit("status:update", "Cannot save: no template selected.");
        return;
      }

      await window.api.templates.saveTemplate(template, updatedYaml);
    }
  );

  // ── Sidebars ──
  window.templateListManager = createTemplateListManager(
    templateModal,
    templateDropdown
  );

  const metaListManager = createStorageListManager(
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
    metaListManager,
    templateEditor,
  });

  bindFormDependencies({
    formManager,
    metaListManager,
  });

  bindListDependencies({
    templateListManager: window.templateListManager,
    metaListManager,
  });

  // ── Initial Data Load ──
  await Promise.all([
    loadTemplateOptions(),
    templateListManager.loadList(),
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
