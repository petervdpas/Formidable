// modules/modalManager.js

import { enableElementResizing } from "../utils/resizing.js";
import { enableEscToClose } from "../utils/modalUtils.js";
import { createModalCloseButton } from "./uiButtons.js";

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
    if (titleRow) {
      // Insert close button after the title row (preferred layout)
      header.appendChild(newBtn);
    } else if (header) {
      // Fallback if no title row is defined
      header.appendChild(newBtn);
    }

    close = newBtn;
  }

  if (!modal.classList.contains("large")) {
    modal.style.width = width;
    modal.style.height = height;
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
    if (backdrop) backdrop.classList.add("show");
    if (escToClose) {
      removeEscListener = enableEscToClose(hide);
    }
  };

  const hide = () => {
    modal.classList.remove("show");
    if (backdrop) backdrop.classList.remove("show");
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
