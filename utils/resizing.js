// utils/resizing.js

import { EventBus } from "../modules/eventBus.js";

// Splitter logic
export function setupSplitter({
  splitter,
  left,
  right,
  container,
  min = 150,
  configKey = null,
}) {
  let isDragging = false;
  let startX = 0;
  let startLeftBasisPx = 0;
  let lastPx = null;    // current left width in px (clamped)
  let lastRatio = null; // only for internal resize math if you want it later

  const handle = splitter.querySelector("div") || splitter;
  const splitW = () => splitter.offsetWidth || 6;
  const cw = () => container.clientWidth || 0;

  // convert legacy saved values to pixels (accept ratio/percent/px)
  const toPixels = (val, containerWidth) => {
    if (val == null) return null;

    if (typeof val === "string") {
      const s = val.trim();
      if (s.endsWith("%")) {
        const p = parseFloat(s);
        return Number.isFinite(p) ? (p / 100) * containerWidth : null;
      }
      if (s.endsWith("px")) {
        const px = parseFloat(s);
        return Number.isFinite(px) ? px : null;
      }
      const n = parseFloat(s);
      val = Number.isFinite(n) ? n : null;
    }

    if (typeof val === "number") {
      if (val <= 1) return val * containerWidth;        // legacy ratio
      if (val > 1 && val <= 100) return (val / 100) * containerWidth; // legacy %
      return val; // px
    }
    return null;
  };

  const getLeftBasisPx = () => {
    const fb = parseFloat(getComputedStyle(left).flexBasis);
    return Number.isFinite(fb) ? fb : left.offsetWidth;
  };

  const applyLeftWidth = (px) => {
    const containerWidth = cw();
    const maxLeftWidth = Math.max(min, containerWidth - min - splitW());
    const clamped = Math.min(Math.max(px, min), maxLeftWidth);

    left.style.flex = "0 0 auto";
    left.style.flexBasis = `${clamped}px`;
    left.style.removeProperty("width");

    right.style.flex = "1 1 auto";
    right.style.removeProperty("width");

    lastPx = clamped;
    lastRatio = containerWidth > 0 ? clamped / containerWidth : null;
    return clamped;
  };

  const updateCursor = (active) => {
    document.body.style.cursor = active ? "col-resize" : "";
  };

  // Restore from config (px preferred; ratio/% supported)
  const applyFromConfig = () => {
    if (!configKey) return false;
    const saved = window.userConfig?.[configKey];
    if (saved == null) return false;
    const px = toPixels(saved, cw());
    if (!Number.isFinite(px)) return false;
    applyLeftWidth(px);
    return true;
  };

  handle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startLeftBasisPx = getLeftBasisPx();
    updateCursor(true);
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    applyLeftWidth(startLeftBasisPx + dx);
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    updateCursor(false);

    if (configKey) {
      // SAVE AS PX (integer). No more 0.xxx values.
      const px = Math.round(getLeftBasisPx());
      EventBus.emit("config:update", { [configKey]: px });
    }
  });

  // Keep handle sane on window/container resize.
  // Default behavior: keep absolute PX (lastPx) and just clamp.
  const onResize = () => {
    if (lastPx != null) {
      applyLeftWidth(lastPx);
    } else if (!applyFromConfig()) {
      applyLeftWidth(getLeftBasisPx());
    }
  };

  window.addEventListener("resize", onResize);
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // Initial apply: use config if present; else normalize DOM
  requestAnimationFrame(() => {
    if (!applyFromConfig()) onResize();
  });
} 

export function enableElementResizing(
  target,
  grip,
  { minWidth = 300, minHeight = 200 } = {}
) {
  let isResizing = false;

  grip.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = target.offsetWidth;
    const startHeight = target.offsetHeight;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      target.style.width = `${Math.max(newWidth, minWidth)}px`;
      target.style.height = `${Math.max(newHeight, minHeight)}px`;
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
