// modules/modalManager.js

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
  const close =
    typeof closeBtn === "string" ? document.getElementById(closeBtn) : closeBtn;

  // 🧱 Apply initial size
  modal.style.width = width;
  modal.style.height = height;

  // 🪟 Optionally add resizer grip
  if (resizable) {
    const resizer = document.createElement("div");
    resizer.classList.add("modal-resizer");
    modal.appendChild(resizer);
    enableResizing(modal, resizer);
  }

  const show = () => {
    onOpen(modal);
    modal.classList.add("show");
    if (backdrop) backdrop.classList.add("show");
    if (escToClose) enableEscListener();
  };

  const hide = () => {
    modal.classList.remove("show");
    if (backdrop) backdrop.classList.remove("show");
    onClose(modal);
    if (escToClose) disableEscListener();
  };

  if (open) open.addEventListener("click", show);
  if (close) close.addEventListener("click", hide);

  const escHandler = (e) => {
    if (e.key === "Escape") hide();
  };
  const enableEscListener = () =>
    document.addEventListener("keydown", escHandler);
  const disableEscListener = () =>
    document.removeEventListener("keydown", escHandler);

  if (backdropClick) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
  }

  return { show, hide };
}

function enableResizing(modal, grip) {
  let isResizing = false;

  grip.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modal.offsetWidth;
    const startHeight = modal.offsetHeight;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      modal.style.width = `${Math.max(newWidth, 300)}px`;
      modal.style.height = `${Math.max(newHeight, 200)}px`;
    };

    const onMouseUp = () => {
      isResizing = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

export function showConfirmModal(
  message,
  {
    okText = "OK",
    cancelText = "Cancel",
    width = "30em",
    height = "auto",
    escToClose = true,
    backdropClick = true,
    resizable = false,
  } = {}
) {
  const modal = setupModal("confirm-modal", {
    escToClose,
    backdropClick,
    width,
    height,
    resizable,
  });

  const messageEl = document.getElementById("confirm-message");
  const okBtn = document.getElementById("confirm-ok");
  const cancelBtn = document.getElementById("confirm-cancel");

  messageEl.textContent = message;
  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;

  return new Promise((resolve) => {
    okBtn.onclick = () => {
      modal.hide();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      modal.hide();
      resolve(false);
    };

    modal.show();
  });
}
