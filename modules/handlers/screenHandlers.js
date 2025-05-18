// modules/handlers/screenHandlers.js

import { toggleFullscreen } from "../../utils/screenUtils.js";

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
