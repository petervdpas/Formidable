// utils/pasteDataWidget.js
//
// Inline floating "paste data" widget — anchored to its trigger button,
// styled like the Quick Commit popup. Re-positions on scroll/resize so it
// stays glued to the button while the form scrolls underneath.

import { createOptionPanel } from "./elementBuilders.js";
import { Toast } from "./toastUtils.js";
import { t } from "./i18n.js";
import { parsePastedRows } from "./pasteDataUtils.js";

const GUTTER = 8;
const GAP = 4; // distance between button and popup

/**
 * Open the paste-data widget anchored to `triggerEl`.
 *
 * @param {object}      opts
 * @param {HTMLElement} opts.triggerEl  Element the popup anchors to
 * @param {string}      [opts.title]    Header title
 * @param {string}      [opts.subtitle] Helper text under the title
 * @param {(rows: string[][]) => void} opts.onProcess  Receives parsed rows
 */
export function openPasteDataWidget({
  triggerEl,
  title,
  subtitle,
  onProcess,
} = {}) {
  // Single-instance: dispose any prior widget popup.
  document.querySelectorAll(".paste-data-popup").forEach((el) => el.remove());

  const host = document.createElement("div");
  // No `popup-visible` — the inner .option-panel already has border + padding,
  // so adding popup-visible chrome would render a double border.
  host.className = "popup-panel paste-data-popup";
  host.style.position = "fixed";
  host.style.visibility = "hidden";

  const panel = createOptionPanel(
    {
      title: title || t("paste.title", "Paste data"),
      message:
        subtitle ||
        t(
          "paste.subtitle",
          "Paste rows from Excel — one row per line, columns separated by tabs."
        ),
      inputs: [
        {
          id: "pasteText",
          kind: "textarea",
          placeholder: t(
            "paste.placeholder",
            "Paste here (Ctrl+V) and click Process."
          ),
          rows: 8,
        },
      ],
      actions: [
        {
          value: "process",
          label: t("paste.process", "Process"),
          variant: "primary",
        },
        {
          value: "cancel",
          label: t("standard.cancel", "Cancel"),
          variant: "quiet",
        },
      ],
    },
    (val, ctx) => {
      if (val === "cancel") {
        close();
        return;
      }
      if (val !== "process") return;

      const text = ctx.inputs.pasteText?.value || "";
      const { rows } = parsePastedRows(text);
      if (!rows.length) {
        Toast.warning("paste.empty");
        return;
      }
      try {
        onProcess?.(rows);
        Toast.success("paste.success", [rows.length]);
        close();
      } catch (err) {
        Toast.error("paste.failed");
        console.error("[pasteDataWidget] onProcess failed:", err);
      }
    }
  );

  host.appendChild(panel.element);
  document.body.appendChild(host);

  // ── Positioning ───────────────────────────────────────────────────
  const place = () => {
    const rect = triggerEl?.getBoundingClientRect?.();
    if (!rect) return;
    const w = host.offsetWidth;
    const h = host.offsetHeight;

    let left = rect.left;
    let top = rect.bottom + GAP;

    // flip above when no room below
    const fitsBelow = top + h <= window.innerHeight - GUTTER;
    const fitsAbove = rect.top - h - GAP >= GUTTER;
    if (!fitsBelow && fitsAbove) top = rect.top - h - GAP;

    // clamp horizontally
    if (left + w > window.innerWidth - GUTTER) {
      left = Math.max(GUTTER, window.innerWidth - w - GUTTER);
    }
    if (left < GUTTER) left = GUTTER;
    // clamp vertically (last resort)
    if (top < GUTTER) top = GUTTER;
    if (top + h > window.innerHeight - GUTTER) {
      top = Math.max(GUTTER, window.innerHeight - h - GUTTER);
    }

    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  };

  // ── Dismiss handling ──────────────────────────────────────────────
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const onMouseDown = (e) => {
    if (host.contains(e.target)) return;
    if (triggerEl && triggerEl.contains(e.target)) return;
    close();
  };
  const onScroll = () => place();
  const onResize = () => place();

  function close() {
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll, true);
    host.remove();
  }

  // initial placement
  requestAnimationFrame(() => {
    place();
    host.style.visibility = "";
    panel.focusFirstInput?.();
  });

  document.addEventListener("keydown", onKey, true);
  document.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("resize", onResize);
  // capture:true so we catch scroll events from any nested scrolling ancestor
  window.addEventListener("scroll", onScroll, true);

  return { close };
}
