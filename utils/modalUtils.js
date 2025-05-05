// utils/modalUtils.js

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

  if (typeDef?.cssClass) {
    modalEl.classList.add(typeDef.cssClass);
  }
}
