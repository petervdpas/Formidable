// utils/modalUtils.js

import { EventBus } from "../modules/eventBus.js";
import { enableElementResizing } from "./resizing.js";
import {
  createButton,
  createCancelButton,
  createConfirmButton,
  buildButtonGroup,
} from "./buttonUtils.js";
import { t, translateDOM } from "./i18n.js";

function createModalCloseButton({
  onClick = () => {},
  id = "modal-cancel",
  text = "✕",
  className = "btn-close",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}

let openModalCount = 0;

export function setupModal(
  modalId,
  {
    openBtn,
    closeBtn,
    onOpen = () => {},
    onClose = () => {},
    escToClose = false,
    backdropClick = false,
    width = "60%",
    height = "70%",
    maxHeight = null,
    resizable = true,
    inertBackground = false,
    disableCloseWhenDisabled = true,
  } = {}
) {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal) {
    console.warn(`[setupModal] Modal #${modalId} not found`);
    return {
      show: () => {},
      hide: () => {},
      setDisabled: () => {},
      setEnabled: () => {},
      isDisabled: () => false,
    };
  }

  // Resolve open trigger
  const open =
    typeof openBtn === "string" ? document.getElementById(openBtn) : openBtn;

  // Resolve/create close button
  let close = closeBtn;
  if (typeof closeBtn === "string") {
    const header = modal.querySelector(".modal-header");
    header?.querySelectorAll(".btn-close")?.forEach((el) => el.remove());

    const newBtn = createModalCloseButton({
      id: closeBtn,
      onClick: () => hide(),
    });

    const titleRow = header?.querySelector(".modal-title-row");
    if (titleRow) header.appendChild(newBtn);
    else if (header) header.appendChild(newBtn);

    close = newBtn;
  }

  // Dimensions (skip if modal has a fixed "large" class)
  if (!modal.classList.contains("large")) {
    modal.style.width = width;
    modal.style.height = height;
  }
  if (maxHeight) modal.style.maxHeight = maxHeight;

  // Optional resizer
  let resizer = null;
  if (resizable) {
    resizer = document.createElement("div");
    resizer.classList.add("modal-resizer");
    modal.appendChild(resizer);
    enableElementResizing(modal, resizer);
  }

  // ────────────────────────────────────────────────────────────
  // Disabled / Inert handling
  // ────────────────────────────────────────────────────────────
  let removeEscListener = null;
  let isDisabled = false;
  let inertSet = false;
  let previouslyInert = [];

  function setBackgroundInert(excludeEl) {
    if (inertSet) return;
    previouslyInert = [];
    const siblings = document.querySelectorAll(
      "body > *:not(script):not(style)"
    );
    siblings.forEach((el) => {
      // Only mark true siblings (exclude modal itself and its descendants)
      if (el !== excludeEl && !excludeEl.contains(el)) {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
        previouslyInert.push(el);
      }
    });
    inertSet = true;
  }

  function unsetBackgroundInert() {
    if (!inertSet) return;
    previouslyInert.forEach((el) => {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
    });
    previouslyInert = [];
    inertSet = false;
  }

  function setDisabled() {
    if (isDisabled) return;
    isDisabled = true;
    modal.classList.add("modal-disabled");
    modal.setAttribute("aria-busy", "true");

    if (disableCloseWhenDisabled && close) {
      try {
        close.disabled = true;
      } catch (_) {}
    }
    if (resizer) resizer.style.display = "none";

    // Disable ESC while disabled
    if (removeEscListener) {
      removeEscListener();
      removeEscListener = null;
    }
  }

  function setEnabled() {
    if (!isDisabled) return;
    isDisabled = false;
    modal.classList.remove("modal-disabled");
    modal.removeAttribute("aria-busy");

    if (disableCloseWhenDisabled && close) {
      try {
        close.disabled = false;
      } catch (_) {}
    }
    if (resizer) resizer.style.display = "";

    // Re-enable ESC if desired and still open
    if (escToClose && modal.classList.contains("show") && !removeEscListener) {
      removeEscListener = enableEscToClose(hide);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Show / Hide
  // ────────────────────────────────────────────────────────────
  const show = () => {
    // Allow onOpen to run before we mark visible (so it can inject UI)
    onOpen(modal, api);
    modal.classList.add("show");

    if (backdrop) {
      openModalCount++;
      backdrop.classList.add("show");
    }

    if (inertBackground) setBackgroundInert(modal);

    if (escToClose && !isDisabled) {
      removeEscListener = enableEscToClose(hide);
    }
  };

  const hide = () => {
    // Do nothing if disabled
    if (isDisabled) return;

    modal.classList.remove("show");

    if (backdrop && openModalCount > 0) {
      openModalCount--;
      if (openModalCount === 0) {
        backdrop.classList.remove("show");
      }
    }

    unsetBackgroundInert();
    onClose(modal, api);

    if (removeEscListener) {
      removeEscListener();
      removeEscListener = null;
    }
  };

  // ────────────────────────────────────────────────────────────
  // Listeners
  // ────────────────────────────────────────────────────────────
  if (open) open.addEventListener("click", show);
  if (close) {
    close.addEventListener("click", () => {
      if (!isDisabled) hide();
    });
  }

  if (backdropClick) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal && !isDisabled) hide();
    });
  }

  // Public API
  const api = {
    show,
    hide,
    setDisabled,
    setEnabled,
    isDisabled: () => isDisabled,
  };

  return api;
}

export function setupPluginModal({
  pluginName = "Plugin",
  id = "plugin-modal",
  title = "Plugin Modal",
  body = "",
  width = "40%",
  height = "auto",
  maxHeight = null,
  resizable = true,
  escToClose = true,
  backdropClick = true,
  inertBackground = false,
  disableCloseWhenDisabled = true,
  onOpen = () => {},
  onClose = () => {},
  prepareBody = null,
} = {}) {
  const existing = document.getElementById(id);
  if (existing) {
    console.warn(
      `[setupPluginModal] Modal with id "${id}" already exists. Removing...`
    );
    existing.remove();
  }

  // ── Shell
  const modal = document.createElement("div");
  modal.id = id;
  modal.className = "modal";

  // ── Header
  const header = document.createElement("div");
  header.className = "modal-header";

  const titleRow = document.createElement("div");
  titleRow.className = "modal-title-row";

  const titleEl = document.createElement("h2");
  titleEl.textContent = title;

  titleRow.appendChild(titleEl);
  header.appendChild(titleRow);

  // ── Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";

  const changeBody = (content) => {
    bodyEl.innerHTML = "";
    if (typeof content === "string") {
      bodyEl.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      bodyEl.appendChild(content);
    } else {
      EventBus.emit("logging:warning", [
        `[setupPluginModal] changeBody: invalid content (must be string or HTMLElement)`,
      ]);
    }
  };

  // Initial content
  changeBody(body);

  // Optional body mutation hook
  if (typeof prepareBody === "function") {
    try {
      prepareBody(modal, bodyEl);
    } catch (err) {
      EventBus.emit("logging:error", [
        "[setupPluginModal] prepareBody failed:",
        err,
      ]);
    }
  }

  // Assemble into DOM
  modal.appendChild(header);
  modal.appendChild(bodyEl);
  const host = document.getElementById("plugin-executor") || document.body;
  host.appendChild(modal);

  // We want plugin onOpen/onClose to receive the full plugin API (incl. disable funcs).
  // Use a closure that we fill after setupModal returns.
  let pluginApi = null;
  const wrappedOnOpen = (el, baseApi) => {
    try {
      onOpen(el, pluginApi || baseApi);
    } catch (err) {
      EventBus.emit("logging:error", [
        "[setupPluginModal] onOpen failed:",
        err,
      ]);
    }
  };
  const wrappedOnClose = (el, baseApi) => {
    try {
      onClose(el, pluginApi || baseApi);
    } catch (err) {
      EventBus.emit("logging:error", [
        "[setupPluginModal] onClose failed:",
        err,
      ]);
    }
    EventBus.emit("status:update", {
      message: "status.plugin.run.completed",
      languageKey: "status.plugin.run.completed",
      i18nEnabled: true,
      args: [pluginName],
    });
  };

  // Delegate to setupModal for behavior and controls.
  const baseApi = setupModal(id, {
    closeBtn: `${id}-close`, // setupModal will create/attach the close button
    escToClose,
    backdropClick,
    width,
    height,
    maxHeight,
    resizable,
    inertBackground,
    disableCloseWhenDisabled,
    onOpen: wrappedOnOpen,
    onClose: wrappedOnClose,
  });

  // Compose and return the full plugin API (now includes disable controls).
  pluginApi = {
    modal,
    changeBody,
    show: baseApi.show,
    hide: baseApi.hide,
    setDisabled: baseApi.setDisabled,
    setEnabled: baseApi.setEnabled,
    isDisabled: baseApi.isDisabled,
  };

  return pluginApi;
}

export function setupPopup(popupId, defaultOptions = {}) {
  const popup =
    typeof popupId === "string" ? document.getElementById(popupId) : popupId;

  if (!popup) {
    EventBus.emit("logging:warning", [
      `[setupPopup] Popup not found: ${popupId}`,
    ]);
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

export function enableEscToClose(onEscape) {
  const handler = (e) => {
    if (e.key === "Escape") onEscape();
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

export function applyModalCssClass(modalEl, typeDef) {
  if (!modalEl) return;

  modalEl.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modalEl.classList.remove(cls);
    }
  });

  const cssClass =
    typeof typeDef?.cssClass === "string"
      ? typeDef.cssClass
      : typeDef?.cssClass?.main;

  if (cssClass && typeof cssClass === "string") {
    modalEl.classList.add(cssClass);
  }
}

export function showConfirmModal(i18nKey, extraHtml = null, options = {}) {
  const modal = setupModal("confirm-modal", {
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
    resizable: false,
    ...options,
  });

  const messageEl = document.getElementById("confirm-message");
  const buttonWrapper = document.getElementById("confirm-buttons-wrapper");

  // Set translation key
  messageEl.innerHTML = `<div data-i18n-html="${i18nKey}">${t(i18nKey)}</div>${
    extraHtml || ""
  }`;

  return new Promise((resolve) => {
    const okBtn = createConfirmButton({
      text:
        options.okText ||
        (options.okKey ? t(options.okKey) : t("standard.confirm")),
      variant: options.variant || "okay",
      onClick: () => {
        modal.hide();
        resolve(true);
      },
    });

    const cancelBtn = createCancelButton({
      text:
        options.cancelText ||
        (options.cancelKey ? t(options.cancelKey) : t("standard.cancel")),
      onClick: () => {
        modal.hide();
        resolve(false);
      },
    });

    buttonWrapper.innerHTML = "";
    buttonWrapper.appendChild(buildButtonGroup(okBtn, cancelBtn));

    translateDOM(modal.element || document.getElementById("confirm-modal"));

    modal.show();
  });
}
