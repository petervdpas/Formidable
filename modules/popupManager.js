// modules/popupManager.js

import { enableElementResizing } from "../utils/resizing.js";
import { createModalCloseButton } from "./uiButtons.js";

export function setupPopup(popupId, defaultOptions = {}) {
  const popup =
    typeof popupId === "string" ? document.getElementById(popupId) : popupId;

  if (!popup) {
    console.warn("[popupManager] Popup not found:", popupId);
    return { show: () => {}, hide: () => {}, popup: null };
  }

  // Defaults
  const config = {
    triggerBtn: null,
    onOpen: () => {},
    onClose: () => {},
    escToClose: false,
    resizable: false,
    width: "20em",
    height: "auto",
    position: "auto", // "above", "auto", or { top, left }
    ...defaultOptions,
  };

  let escListener = null;

  // Base style
  popup.classList.add("popup-panel");

  const header = popup.querySelector(".popup-header");
  if (header) {
    header.querySelectorAll(".popup-close-btn").forEach((btn) => btn.remove());
    const closeBtn = createModalCloseButton({ onClick: () => hide() });
    closeBtn.classList.add("popup-close-btn");
    header.appendChild(closeBtn);
  }

  function show(event = null, overrides = {}) {
    const opts = { ...config, ...overrides };
    popup.style.display = "block";

    const rect = event?.target?.getBoundingClientRect?.();

    if (opts.position === "above" && rect) {
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${
        rect.top + window.scrollY - popup.offsetHeight - 8
      }px`;
    } else if (opts.position === "auto" && rect) {
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    } else if (
      typeof opts.position === "object" &&
      opts.position.top &&
      opts.position.left
    ) {
      popup.style.top = opts.position.top;
      popup.style.left = opts.position.left;
    }

    if (opts.escToClose) {
      escListener = (e) => {
        if (e.key === "Escape") hide();
      };
      window.addEventListener("keydown", escListener);
    }

    opts.onOpen?.(popup);
  }

  function hide() {
    popup.style.display = "none";
    config.onClose?.(popup);
    if (escListener) {
      window.removeEventListener("keydown", escListener);
      escListener = null;
    }
  }

  if (config.resizable) {
    const resizer = document.createElement("div");
    resizer.classList.add("popup-resizer");
    popup.appendChild(resizer);
    enableElementResizing(popup, resizer);
  }

  if (config.triggerBtn) {
    const trigger =
      typeof config.triggerBtn === "string"
        ? document.getElementById(config.triggerBtn)
        : config.triggerBtn;

    if (trigger) trigger.addEventListener("click", show);
  }

  return { show, hide, popup };
}
