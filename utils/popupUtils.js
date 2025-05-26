// utils/popupUtils.js

export function showOptionPopup(triggerInput, options) {
  // Remove any existing popup first
  const existing = document.querySelector(".popup-selector");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.className = "popup-selector";

  // Positioning logic
  const rect = triggerInput.getBoundingClientRect();
  const optionHeight = 24; // Approximate height per option (including padding & margin)
  const maxVisible = 5;
  const popupHeight = Math.min(options.length, maxVisible) * optionHeight + 16;

  const fitsBelow = window.innerHeight - rect.bottom > popupHeight;
  const fitsAbove = rect.top > popupHeight;

  popup.style.position = "fixed";
  popup.style.left = `${rect.left}px`;
  // popup.style.minWidth = `${rect.width}px`;
  popup.style.maxHeight = `${popupHeight}px`;
  popup.style.overflowY = "auto";

  popup.style.top = fitsBelow
    ? `${rect.bottom}px`
    : fitsAbove
    ? `${rect.top - popupHeight}px`
    : `${rect.bottom}px`; // fallback

  // Options
  options.forEach(({ value, label }) => {
    const btn = document.createElement("button");
    btn.className = "popup-option";
    btn.textContent = label || value;
    btn.onclick = () => {
      triggerInput.value = value;
      cleanup();
      triggerInput.dispatchEvent(new Event("input", { bubbles: true }));
    };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);

  // Prevent scroll bleed
  popup.addEventListener("wheel", (e) => {
    const { scrollTop, scrollHeight, clientHeight } = popup;
    const delta = e.deltaY;
    const atTop = scrollTop === 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight;

    if ((atTop && delta < 0) || (atBottom && delta > 0)) {
      e.preventDefault();
    }
    e.stopPropagation();
  }, { passive: false });

  // Only remove if a value is selected (no outside click close)
  function cleanup() {
    popup.remove();
    document.removeEventListener("mousedown", onClickOutside);
  }

  const onClickOutside = (e) => {
    if (!popup.contains(e.target) && e.target !== triggerInput) {
      // Do nothing — only close via selection
    }
  };

  document.addEventListener("mousedown", onClickOutside);
}
