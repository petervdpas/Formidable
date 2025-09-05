// utils/hotkeyUtils.js

/**
 * Convert a combo string like "Ctrl+Shift+S" to a normalized descriptor.
 * Supports: Ctrl, Meta, Alt, Shift + a single key (letter, digit, F-keys, etc.)
 */
function parseCombo(combo) {
  if (!combo || typeof combo !== "string") return null;
  const parts = combo.split("+").map(s => s.trim().toLowerCase());

  const desc = { ctrl: false, meta: false, alt: false, shift: false, key: "" };
  for (const p of parts) {
    if (p === "ctrl" || p === "control") desc.ctrl = true;
    else if (p === "meta" || p === "cmd" || p === "command") desc.meta = true;
    else if (p === "alt" || p === "option") desc.alt = true;
    else if (p === "shift") desc.shift = true;
    else desc.key = p; // last piece should be the key
  }
  return desc.key ? desc : null;
}

/**
 * Render a user-friendly label for a combo, cross-platform.
 * E.g. on mac, "⌘S"; elsewhere "Ctrl+S".
 */
export function comboLabel(combo) {
  const isMac = /mac/i.test(navigator.platform);
  const label = combo
    .replace(/Command|Cmd|Meta/gi, isMac ? "⌘" : "Ctrl")
    .replace(/Control|Ctrl/gi, "Ctrl")
    .replace(/Option|Alt/gi, isMac ? "⌥" : "Alt")
    .replace(/Shift/gi, isMac ? "⇧" : "Shift")
    .replace(/\s*\+\s*/g, isMac ? "" : "+");
  return label;
}

/**
 * Default predicate: ignore hotkeys while typing in inputs/textareas/contenteditable.
 */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || el.isContentEditable) return true;
  return false;
}

/**
 * Bind a set of hotkeys scoped to a container (page/section).
 *
 * @param {HTMLElement} scopeEl - The element whose lifecycle will own the binding (use your top-level container).
 * @param {Array<{ combo: string|string[], onTrigger: Function, button?: HTMLElement, title?: string, titleKey?: string }>} bindings
 * @param {Object} options
 *   - allowWhenTyping?: boolean (default: false)
 *   - stopPropagation?: boolean (default: true)
 *   - preventDefault?: boolean (default: true)
 *   - i18n?: (key: string, ...args:any[]) => string  (if you want i18n titles)
 */
export function bindHotkeys(scopeEl, bindings = [], options = {}) {
  if (!scopeEl) throw new Error("bindHotkeys: scopeEl is required");
  unbindHotkeys(scopeEl); // prevent duplicate listeners

  const opts = {
    allowWhenTyping: false,
    stopPropagation: true,
    preventDefault: true,
    i18n: null,
    ...options,
  };

  // Pre-parse combos
  const rules = [];
  for (const b of bindings) {
    const combos = Array.isArray(b.combo) ? b.combo : [b.combo];
    const parsed = combos.map(parseCombo).filter(Boolean);
    if (!parsed.length || typeof b.onTrigger !== "function") continue;
    rules.push({ parsed, onTrigger: b.onTrigger, button: b.button, title: b.title, titleKey: b.titleKey, raw: combos });
  }

  // Set button tooltips with the combo label
  for (const r of rules) {
    if (r.button) {
      const hint =
        (r.titleKey && typeof opts.i18n === "function" ? opts.i18n(r.titleKey) : r.title) ||
        r.button.getAttribute("title") ||
        "";
      const comboText = comboLabel(Array.isArray(r.raw) ? r.raw[0] : r.raw);
      const sep = hint ? " • " : "";
      r.button.setAttribute("title", `${hint}${sep}${comboText}`);
      r.button.setAttribute("aria-label", `${hint || r.button.textContent} (${comboText})`);
    }
  }

  const handler = (e) => {
    // Ignore when typing if desired
    if (!opts.allowWhenTyping && isTypingTarget(e.target)) return;

    const key = (e.key || "").toLowerCase();
    const state = {
      ctrl: !!e.ctrlKey,
      meta: !!e.metaKey,
      alt: !!e.altKey,
      shift: !!e.shiftKey,
      key,
    };

    for (const r of rules) {
      for (const d of r.parsed) {
        // Match the key (letters/digits: normalize to lower)
        const keyMatch =
          d.key === key ||
          // Function keys (F1, F2, ...):
          (d.key.startsWith("f") && key === d.key) ||
          // Allow '+' as key
          (d.key === "+" && e.key === "+");

        if (
          keyMatch &&
          d.ctrl === state.ctrl &&
          d.meta === state.meta &&
          d.alt === state.alt &&
          d.shift === state.shift
        ) {
          if (opts.preventDefault) e.preventDefault();
          if (opts.stopPropagation) e.stopPropagation();
          r.onTrigger();
          return;
        }
      }
    }
  };

  window.addEventListener("keydown", handler);
  scopeEl.__hotkeyHandler = handler; // store for cleanup
}

/**
 * Remove previously bound hotkeys for a container.
 */
export function unbindHotkeys(scopeEl) {
  if (scopeEl && scopeEl.__hotkeyHandler) {
    window.removeEventListener("keydown", scopeEl.__hotkeyHandler);
    delete scopeEl.__hotkeyHandler;
  }
}
