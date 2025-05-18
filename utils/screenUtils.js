// utils/screenUtils.js

export function toggleFullscreen(wrapper, {
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
