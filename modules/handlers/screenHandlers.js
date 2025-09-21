// modules/handlers/screenHandlers.js

function toggleFullscreen(wrapper, {
  hintText = "ESC to exit fullscreen",
  refresh = null,
} = {}) {
  if (!wrapper) return;

  const entering = !wrapper.classList.contains("fullscreen");
  wrapper.classList.toggle("fullscreen");

  setTimeout(() => refresh?.(), 50);

  const oldHint = wrapper.querySelector(".fullscreen-hint");
  if (oldHint) oldHint.remove();

  if (entering) {
    const hint = document.createElement("div");
    hint.className = "fullscreen-hint";
    hint.textContent = hintText;
    wrapper.appendChild(hint);
  }
}

export function handleFullscreenToggle(targetId) {
  const wrapper =
    typeof targetId === "string" ? document.getElementById(targetId) : targetId;

  if (!wrapper) return;

  toggleFullscreen(wrapper, {
    refresh: () => {
      const cm = wrapper.querySelector(".CodeMirror");
      if (cm?.CodeMirror?.refresh) {
        cm.CodeMirror.refresh();
      }
    },
    hintText: "ESC to exit fullscreen",
  });
}

export function handleStorageMetaVisibility(enabled) {
  const show = !!enabled;

  const metaEl = document.getElementById("storage-meta");
  if (metaEl) metaEl.style.display = show ? "" : "none";

  const toggle = document.getElementById("show-meta-toggle");
  if (toggle) {
    toggle.checked = show;
    const label = toggle.closest(".switch")?.querySelector(".switch-state");
    if (label) label.textContent = show ? (window.i18n?.t?.("standard.show") || "Show")
                                        : (window.i18n?.t?.("standard.hide") || "Hide");
  }
}
