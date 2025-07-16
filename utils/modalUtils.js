// utils/modalUtils.js

import { EventBus } from "../modules/eventBus.js";
import { enableElementResizing } from "./resizing.js";
import {
  createButton,
  createCancelButton,
  createConfirmButton,
  buildButtonGroup,
} from "./buttonUtils.js";

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
  } = {}
) {
  const modal = document.getElementById(modalId);
  const backdrop = document.getElementById("modalBackdrop");

  const open =
    typeof openBtn === "string" ? document.getElementById(openBtn) : openBtn;

  let close = closeBtn;

  if (typeof closeBtn === "string") {
    const header = modal?.querySelector(".modal-header");
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

  if (!modal.classList.contains("large")) {
    modal.style.width = width;
    modal.style.height = height;
  }

  if (maxHeight) {
    modal.style.maxHeight = maxHeight;
  }

  if (resizable) {
    const resizer = document.createElement("div");
    resizer.classList.add("modal-resizer");
    modal.appendChild(resizer);
    enableElementResizing(modal, resizer);
  }

  let removeEscListener = null;

  const show = () => {
    onOpen(modal);
    modal.classList.add("show");

    if (backdrop) {
      openModalCount++;
      backdrop.classList.add("show");
    }

    if (escToClose) {
      removeEscListener = enableEscToClose(hide);
    }
  };

  const hide = () => {
    modal.classList.remove("show");

    if (backdrop && openModalCount > 0) {
      openModalCount--;
      if (openModalCount === 0) {
        backdrop.classList.remove("show");
      }
    }

    onClose(modal);
    if (removeEscListener) {
      removeEscListener();
      removeEscListener = null;
    }
  };

  if (open) open.addEventListener("click", show);
  if (close) close.addEventListener("click", hide);

  if (backdropClick) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
  }

  return { show, hide };
}

export function setupPluginModal({
  id = "plugin-modal",
  title = "Plugin Modal",
  body = "",
  width = "40%",
  height = "auto",
  resizable = true,
  escToClose = true,
  backdropClick = true,
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

  // ── Assemble
  modal.appendChild(header);
  modal.appendChild(bodyEl);

  const host = document.getElementById("plugin-executor") || document.body;
  host.appendChild(modal);

  const { show, hide } = setupModal(id, {
    closeBtn: `${id}-close`,
    escToClose,
    backdropClick,
    width,
    height,
    resizable,
    onOpen,
    onClose,
  });

  return { modal, show, hide, changeBody };
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

export function showConfirmModal(message, { ...options } = {}) {
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

  messageEl.innerHTML = message;

  return new Promise((resolve) => {
    const okBtn = createConfirmButton({
      text: options.okText || "OK",
      onClick: () => {
        modal.hide();
        resolve(true);
      },
    });

    const cancelBtn = createCancelButton({
      text: options.cancelText || "Cancel",
      onClick: () => {
        modal.hide();
        resolve(false);
      },
    });

    buttonWrapper.innerHTML = "";
    buttonWrapper.appendChild(buildButtonGroup(okBtn, cancelBtn));
    modal.show();
  });
}
