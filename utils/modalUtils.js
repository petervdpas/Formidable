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

  const cssClass =
    typeof typeDef?.cssClass === "string"
      ? typeDef.cssClass
      : typeDef?.cssClass?.main;

  if (cssClass && typeof cssClass === "string") {
    modalEl.classList.add(cssClass);
  }
}