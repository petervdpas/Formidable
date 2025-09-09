// utils/hotkeyUtils.js

/**
 * Convert a combo string like "Ctrl+Shift+S" to a normalized descriptor.
 * Supports: Ctrl, Meta, Alt, Shift + a single key (letter, digit, F-keys, etc.)
 */
function parseCombo(combo) {
  if (!combo || typeof combo !== "string") return null;
  const parts = combo.split("+").map((s) => s.trim().toLowerCase());

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
  if (tag === "input" || tag === "textarea" || el.isContentEditable)
    return true;
  return false;
}

/**
 * Check if a container element is visible/active in the DOM.
 * Uses layout presence (client rects) + computed style; no offsetParent.
 */
export function isContainerActive(el) {
  if (!el || !el.isConnected) return false;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  // Hidden ancestors via attributes
  if (el.closest("[hidden], [inert], [aria-hidden='true']")) return false;
  // Has render box?
  return el.getClientRects().length > 0;
}

/**
 * Wrap a handler so it only runs when `container` is the active/visible context
 * and (optionally) the event target is inside that container.
 */
export function withContext(
  container,
  fn,
  { requireTargetInScope = true } = {}
) {
  return (e) => {
    if (!isContainerActive(container)) return;
    const t = e?.target || document.activeElement;
    if (requireTargetInScope && t && !container.contains(t)) return;
    return fn(e);
  };
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
 *   - requireScopeVisible?: boolean (default: true)
 *   - requireTargetInScope?: boolean (default: false)  // <- relaxed default
 *   - i18n?: (key: string, ...args:any[]) => string
 */
export function bindHotkeys(scopeEl, bindings = [], options = {}) {
  if (!scopeEl) throw new Error("bindHotkeys: scopeEl is required");
  unbindHotkeys(scopeEl); // prevent duplicate listeners

  const opts = {
    allowWhenTyping: false,
    stopPropagation: true,
    preventDefault: true,
    requireScopeVisible: true,
    requireTargetInScope: false, // only visible context gates by default
    i18n: null,
    ...options,
  };

  // Pre-parse combos
  const rules = [];
  for (const b of bindings) {
    const combos = Array.isArray(b.combo) ? b.combo : [b.combo];
    const parsed = combos.map(parseCombo).filter(Boolean);
    if (!parsed.length || typeof b.onTrigger !== "function") continue;
    rules.push({
      parsed,
      onTrigger: b.onTrigger,
      button: b.button,
      title: b.title,
      titleKey: b.titleKey,
      raw: combos,
    });
  }

  // Set button tooltips with the combo label
  for (const r of rules) {
    if (r.button) {
      let rawHint =
        (r.titleKey && typeof opts.i18n === "function"
          ? opts.i18n(r.titleKey)
          : r.title) || "";
      const isUntranslated = r.titleKey && rawHint === r.titleKey;
      const hint =
        !rawHint || isUntranslated
          ? r.button.textContent?.trim() || r.button.getAttribute("title") || ""
          : rawHint;

      const comboText = comboLabel(Array.isArray(r.raw) ? r.raw[0] : r.raw);
      const sep = hint ? " • " : "";
      r.button.setAttribute("title", `${hint}${sep}${comboText}`);
      r.button.setAttribute(
        "aria-label",
        `${hint || "Shortcut"} (${comboText})`
      );
    }
  }

  const handler = (e) => {
    // Context gating: only fire when this scope is visible
    if (opts.requireScopeVisible && !isContainerActive(scopeEl)) return;
    // Optionally require the event target to be inside scope
    if (opts.requireTargetInScope && e.target && !scopeEl.contains(e.target))
      return;

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
        const keyMatch =
          d.key === key ||
          (d.key.startsWith("f") && key === d.key) ||
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
          r.onTrigger(e);
          return;
        }
      }
    }
  };

  window.addEventListener("keydown", handler);
  scopeEl.__hotkeyHandler = handler;
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
