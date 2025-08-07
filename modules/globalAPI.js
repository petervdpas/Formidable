// modules/globalAPI.js

import { EventBus } from "./eventBus.js";
import * as pluginUtils from "../utils/pluginUtils.js";
import * as encryptionUtils from "../utils/encryptionUtils.js";
import * as pathUtils from "../utils/pathUtils.js";
import * as modalUtils from "../utils/modalUtils.js";
import * as listUtils from "../utils/listUtils.js";
import * as elementBuilders from "../utils/elementBuilders.js";
import * as domUtils from "../utils/domUtils.js";
import * as buttonUtils from "../utils/buttonUtils.js";
import * as fieldRenderers from "../utils/fieldRenderers.js";
import * as stringUtils from "../utils/stringUtils.js";
import * as transform from "../utils/transformationUtils.js";

export function exposeGlobalAPI() {
  const api = {
    // Core event system
    EventBus,

    // Path Utility function
    path: {
      formatAsRelativePath: pathUtils.formatAsRelativePath,
      stripYamlExtension: pathUtils.stripYamlExtension,
      addYamlExtension: pathUtils.addYamlExtension,
      stripMetaExtension: pathUtils.stripMetaExtension,
      addMetaExtension: pathUtils.addMetaExtension,
    },

    // Encryption utilities
    encryption: {
      encrypt: encryptionUtils.encrypt,
      decrypt: encryptionUtils.decrypt,
      encryptionAvailable: encryptionUtils.encryptionAvailable,
    },

    // Plugin management utilities
    plugin: {
      getConfig: pluginUtils.getUserConfig,
      saveConfig: pluginUtils.saveUserConfig,
      loadPluginTranslations: pluginUtils.loadPluginTranslations,
      getPluginTranslations: pluginUtils.getPluginTranslations,
      getStorageFilesForTemplate: pluginUtils.getStorageFilesForTemplate,
      getTemplateAndData: pluginUtils.getTemplateAndData,
      saveMarkdownTo: pluginUtils.saveMarkdownTo,
      getSettings: pluginUtils.getPluginSettings,
      saveSettings: pluginUtils.savePluginSettings,
      resolvePath: pluginUtils.resolvePath,
      ensureDirectory: pluginUtils.ensureDirectory,
      saveFile: pluginUtils.saveFile,
      loadFile: pluginUtils.loadFile,
      deleteFile: pluginUtils.deleteFile,
      emptyFolder: pluginUtils.emptyFolder,
      copyFolder: pluginUtils.copyFolder,
      copyFile: pluginUtils.copyFile,
      fileExists: pluginUtils.fileExists,
      openExternal: pluginUtils.openExternal,
      proxyFetch: pluginUtils.proxyFetch,
      executeSystemCommand: pluginUtils.executeSystemCommand,
    },

    transform: {
      getValueAtKey: transform.getValueAtKey,
      setValueAtKey: transform.setValueAtKey,
      removeKeyAtPath: transform.removeKeyAtPath,
      renderMarkdown: transform.renderMarkdown,
      parseFrontmatter: transform.parseFrontmatter,
      buildFrontmatter: transform.buildFrontmatter,
      filterFrontmatter: transform.filterFrontmatter,
    },

    // Modal and popup helpers
    modal: {
      setupModal: modalUtils.setupModal,
      setupPluginModal: modalUtils.setupPluginModal,
      setupPopup: modalUtils.setupPopup,
      enableEscToClose: modalUtils.enableEscToClose,
      applyModalCssClass: modalUtils.applyModalCssClass,
    },

    // List management utilities
    list: {
      createListManager: listUtils.createListManager,
      makeSelectableList: listUtils.makeSelectableList,
    },

    // Element creation and manipulation
    builders: {
      createStyledLabel: elementBuilders.createStyledLabel,
      createStyledSelect: elementBuilders.createStyledSelect,
      addContainerElement: elementBuilders.addContainerElement,
      createFormRowInput: elementBuilders.createFormRowInput,
      createFilePicker: elementBuilders.createFilePicker,
      createDirectoryPicker: elementBuilders.createDirectoryPicker,
      wrapInputWithLabel: elementBuilders.wrapInputWithLabel,
      buildHiddenInput: elementBuilders.buildHiddenInput,
      buildReadOnlyInput: elementBuilders.buildReadOnlyInput,
      buildSwitchElement: elementBuilders.buildSwitchElement,
      createSwitch: elementBuilders.createSwitch,
    },

    // DOM/utility helpers
    dom: {
      generateGuid: domUtils.generateGuid,
      clearHighlighted: domUtils.clearHighlighted,
      highlightSelected: domUtils.highlightSelected,
      highlightAndClickForm: domUtils.highlightAndClickForm,
      applyExternalLinkBehavior: domUtils.applyExternalLinkBehavior,
      createFieldManager: domUtils.createFieldManager,
      resolveScopedElement: domUtils.resolveScopedElement,
      applyFieldContextAttributes: domUtils.applyFieldContextAttributes,
      applyDatasetMapping: domUtils.applyDatasetMapping,
      focusFirstInput: domUtils.focusFirstInput,
      applyModalTypeClass: domUtils.applyModalTypeClass,
      applyValueToField: domUtils.applyValueToField,
      bindActionHandlers: domUtils.bindActionHandlers,
      syncScroll: domUtils.syncScroll,
      copyToClipboard: domUtils.copyToClipboard,
    },

    button: {
      createButton: buttonUtils.createButton,
      createIconButton: buttonUtils.createIconButton,
      buildButtonGroup: buttonUtils.buildButtonGroup,
      createToggleButtons: buttonUtils.createToggleButtons,
      disableButton: buttonUtils.disableButton,
    },

    fieldRenderers,

    string: {
      sanitize: stringUtils.sanitize,
      capitalize: stringUtils.capitalize,
      combiMerge: stringUtils.combiMerge,
    },
  };

  // Expose full API
  window.FormidableGlobalAPI = api;

  // Short global aliases
  window.FGA = api;
  window.emit = EventBus.emit;
  window.emitWithResponse = EventBus.emitWithResponse;
  window.on = EventBus.on;
  window.once = EventBus.once;

  EventBus.emit("logging:default", [
    "[GlobalAPI] FormidableGlobalAPI exposed.",
  ]);
}
