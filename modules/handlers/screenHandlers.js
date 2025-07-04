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
