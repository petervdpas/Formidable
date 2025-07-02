// modules/pluginAPI.js

import { EventBus } from "./eventBus.js";
import * as modalUtils from "../utils/modalUtils.js";
import * as domUtils from "../utils/domUtils.js";

export function exposePluginAPI() {
  const api = {
    // Core event system
    EventBus,

    // Modal and popup helpers
    modal: {
      setupModal: modalUtils.setupModal,
      setupPopup: modalUtils.setupPopup,
      enableEscToClose: modalUtils.enableEscToClose,
      applyModalCssClass: modalUtils.applyModalCssClass,
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
      makeSelectableList: domUtils.makeSelectableList,
      bindActionHandlers: domUtils.bindActionHandlers,
      syncScroll: domUtils.syncScroll,
      copyToClipboard: domUtils.copyToClipboard,
    },
  };

  // 🌍 Expose full API
  window.FormidablePluginAPI = api;

  // 🪄 Short global aliases
  window.FPA = api;
  window.emit = EventBus.emit;
  window.on = EventBus.on;
  window.once = EventBus.once;

  console.log("[PluginAPI] FormidablePluginAPI exposed.");
}