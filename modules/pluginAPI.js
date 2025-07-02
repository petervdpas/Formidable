// modules/pluginAPI.js

import { EventBus } from "./eventBus.js";
import * as modalUtils from "../utils/modalUtils.js";
import * as listUtils from "../utils/listUtils.js";
import * as domUtils from "../utils/domUtils.js";
import * as buttonUtils from "../utils/buttonUtils.js";

export function exposePluginAPI() {
  const api = {
    // Core event system
    EventBus,

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
  window.FormidablePluginAPI = api;

  // Short global aliases
  window.FPA = api;
  window.emit = EventBus.emit;
  window.emitWithResponse = EventBus.emitWithResponse;
  window.on = EventBus.on;
  window.once = EventBus.once;

  console.log("[PluginAPI] FormidablePluginAPI exposed.");
}
