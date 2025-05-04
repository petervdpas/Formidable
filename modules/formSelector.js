// modules/formSelector.js

import { EventBus } from "./eventBus.js";

export function createFormSelector(formContainerId) {
  const container = document.getElementById(formContainerId);

  function showNoFormMessage() {
    container.innerHTML = `<div class="empty-message">Please select a form entry.</div>`;
  }

  function clearFormView() {
    container.innerHTML = "";
  }

  function resetSelectedForm() {
    if (window.currentSelectedFormName !== null) {
      window.currentSelectedFormName = null;
      EventBus.emit("form:selected", null);
    }

    const selected = document.querySelector("#markdown-list .selected");
    if (selected) selected.classList.remove("selected");

    window.formManager?.clearFormUI?.();
    showNoFormMessage();
  }

  // Only listen to actual form selection events
  EventBus.on("form:selected", (name) => {
    window.currentSelectedFormName = name;

    if (name === null) {
      window.formManager?.clearFormUI?.();
      showNoFormMessage();
    }
  });

  return {
    showNoFormMessage,
    clearFormView,
    resetSelectedForm,
  };
}
