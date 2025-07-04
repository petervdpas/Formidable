// modules/globalAPI.js

import { EventBus } from "./eventBus.js";
import * as configUtils from "../utils/configUtils.js";
import * as pluginUtils from "../utils/pluginUtils.js";
import * as modalUtils from "../utils/modalUtils.js";
import * as listUtils from "../utils/listUtils.js";
import * as elementBuilders from "../utils/elementBuilders.js";
import * as domUtils from "../utils/domUtils.js";
import * as buttonUtils from "../utils/buttonUtils.js";

export function exposeGlobalAPI() {
  const api = {
    // Core event system
    EventBus,

    // Plugin management utilities
    plugin: {
      getSettings: pluginUtils.getPluginSettings,
      saveSettings: pluginUtils.savePluginSettings,
      resolvePath: pluginUtils.resolvePath,
      saveFile: pluginUtils.saveFile,
      loadFile: pluginUtils.loadFile,
      deleteFile: pluginUtils.deleteFile,
      fileExists: pluginUtils.fileExists,
      openExternal: pluginUtils.openExternal,
      proxyFetch: pluginUtils.proxyFetch,
    },

    // Configuration management
    config: {
      getConfig: configUtils.getUserConfig,
      saveConfig: configUtils.saveUserConfig,
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
      resolveScopedElement: domUtils.resolveScopedElement,
      applyFieldContextAttributes: domUtils.applyFieldContextAttributes,
      applyDatasetMapping: domUtils.applyDatasetMapping,
      focusFirstInput: domUtils.focusFirstInput,
      applyModalTypeClass: domUtils.applyModalTypeClass,
      applyValueToField: domUtils.applyValueToField,
      applyFieldValues: domUtils.applyFieldValues,
      bindActionHandlers: domUtils.bindActionHandlers,
      syncScroll: domUtils.syncScroll,
      copyToClipboard: domUtils.copyToClipboard,
    },

    button: {
      createButton: buttonUtils.createButton,
      createIconButton: buttonUtils.createIconButton,
      buildButtonGroup: buttonUtils.buildButtonGroup,
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

  console.log("[GlobalAPI] FormidableGlobalAPI exposed.");
}
