// modules/templateCodemirror.js
import { EventBus } from "./eventBus.js";
import { getCurrentTheme } from "./themeToggle.js";

// Compute theme *at call*, not at import
const THEME = () => (getCurrentTheme() === "dark" ? "monokai" : "eclipse");

// ── NEW: keep track of editors so we can retheme on the fly
const registry = {
  main: null, // CodeMirror instance
  inlines: new Set(), // Set<CodeMirror>
};

function applyTheme(cm) {
  if (!cm) return;
  cm.setOption("theme", THEME());
  // refresh helps when switching dark/light backgrounds
  requestAnimationFrame(() => cm.refresh());
}

// ── Listen once for theme changes from your theme toggle module
//    Make sure your theme toggle emits: EventBus.emit("theme:changed", { theme: "dark" | "light" })
let subscribedTheme = false;
function ensureThemeSubscription() {
  if (subscribedTheme) return;
  subscribedTheme = true;

  EventBus.on?.("theme:changed", () => {
    // re-apply theme to main and all inline editors
    if (registry.main) applyTheme(registry.main);
    for (const cm of registry.inlines) applyTheme(cm);
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN EDITOR (single instance) — used by templateEditor.js
// ─────────────────────────────────────────────────────────────
let main = {
  cm: null,
  wrapper: null, // .editor-wrapper (only for main)
};

export function initCodeMirror(textarea, initialValue = "") {
  ensureThemeSubscription();

  if (main.cm) main.cm.toTextArea();

  const wrapper = textarea.closest(".editor-wrapper");
  const COMPACT_H = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--editor-compact-h")
      .trim() || "220",
    10
  );

  main.cm = CodeMirror.fromTextArea(textarea, {
    mode: "yaml",
    theme: THEME(),
    lineNumbers: true,
    lineWrapping: true,
    scrollbarStyle: "native",
    viewportMargin: Infinity,
    autofocus: true,
  });

  // Defer listener attach until the instance is definitely alive
  requestAnimationFrame(() => {
    if (main.cm && typeof main.cm.on === "function") {
      main.cm.on("blur", () => main.cm.save());
    }
  });

  requestAnimationFrame(() => {
    main.cm.setValue(initialValue || textarea.value || "");
    main.cm.setSize("100%", COMPACT_H);
    main.cm.refresh();
  });

  main.wrapper = wrapper;
  registry.main = main.cm;

  textarea.addEventListener("blur", () => {
    if (main.cm && typeof main.cm.save === "function") main.cm.save();
  });

  return main.cm;
}

export function getEditor() {
  return main.cm;
}

export function getValue() {
  return main.cm?.getValue().trim() || "";
}

// Keyboard for MAIN editor only (uses .editor-wrapper fullscreen via EventBus)
export function handleEditorKey(e) {
  if (!main.wrapper) return;
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    EventBus.emit("screen:fullscreen", main.wrapper);
    return;
  }
  if (e.key === "Escape" && main.wrapper.classList.contains("fullscreen")) {
    EventBus.emit("screen:fullscreen", main.wrapper);
  }
}

// ─────────────────────────────────────────────────────────────
// INLINE EDITORS (multi-instance) — for modals etc.
// ─────────────────────────────────────────────────────────────

/**
 * Create an independent CodeMirror instance.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {Object} opts
 * @param {string}   opts.mode                 e.g. "javascript", "yaml", "markdown"
 * @param {number}   opts.height               Inline height in px (default: 560)
 * @param {Element}  opts.modalBodyEl          If provided, enables modal fullscreen that fits this element.
 * @param {boolean}  opts.autofocus            Default true
 * @returns {CodeMirror.Editor}
 */
export function createInlineCodeMirror(textarea, opts = {}) {
  ensureThemeSubscription();

  const {
    mode = "javascript",
    height = 560,
    modalBodyEl = null,
    autofocus = true,
  } = opts;

  const cm = CodeMirror.fromTextArea(textarea, {
    mode,
    theme: THEME(),
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    scrollbarStyle: "native",
    viewportMargin: Infinity,
    autofocus,
  });

  cm.setSize("100%", height);
  requestAnimationFrame(() => {
    cm.refresh();
    cm.setSize("100%", height);
  });

  // ── Always mirror buffer → textarea so rebuilds use latest content
  cm.on("change", () => {
    cm.save(); // writes to textarea.value
    // bubble an input event so any validators see live changes
    try {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } catch {}
  });

  // ── NEW: track inline editor for retheming
  registry.inlines.add(cm);

  // Attach modal fullscreen helpers only if a body is provided
  if (modalBodyEl) {
    cm.__modalFS = {
      body: modalBodyEl,
      baseHeight: height,
      resizeHandler: null,
    };

    cm.toggleModalFullscreen = () =>
      cmIsModalFullscreen(cm)
        ? (cm.save(), cmExitModalFullscreen(cm))
        : (cm.save(), cmEnterModalFullscreen(cm));
    cm.enterModalFullscreen = () => cmEnterModalFullscreen(cm);
    cm.exitModalFullscreen = () => cmExitModalFullscreen(cm);
    cm.isModalFullscreen = () => cmIsModalFullscreen(cm);

    // Capture F11 inside CM and prevent bubbling to the app
    cm.addKeyMap({
      F11: (cmInst) => {
        cmInst.save();
        cmInst.toggleModalFullscreen();
        return true; // consumes key
      },
      Esc: (cmInst) => {
        if (cmInst.isModalFullscreen()) cmInst.exitModalFullscreen();
        return true;
      },
    });
  }

  return cm;
}

export function destroyInlineCodeMirror(cm) {
  if (!cm) return;

  // Untrack editor
  registry.inlines.delete(cm);

  // Exit modal fullscreen if needed
  if (cm.__modalFS && cm.isModalFullscreen?.()) cm.exitModalFullscreen();

  // Capture wrapper before toTextArea (so we can remove if CM didn't)
  const wrap = cm.getWrapperElement?.();

  cm.save();
  cm.toTextArea();

  // Some layouts / old CM builds occasionally leave the shell;
  // ensure the wrapper is gone.
  if (wrap && wrap.isConnected) {
    try {
      wrap.remove();
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────
// Modal fullscreen helpers (scoped to a CM instance)
// ─────────────────────────────────────────────────────────────
function cmIsModalFullscreen(cm) {
  return cm.getWrapperElement().classList.contains("cm-modal-fullscreen");
}

function cmEnterModalFullscreen(cm) {
  if (!cm.__modalFS?.body) return;

  const wrap = cm.getWrapperElement();
  wrap.classList.add("cm-modal-fullscreen");

  const fit = () => {
    const h = cm.__modalFS.body.clientHeight - 40; // padding/margins
    cm.setSize("100%", h);
    cm.refresh();
  };
  fit();

  cm.__modalFS.resizeHandler = fit;
  window.addEventListener("resize", fit);
  cm.focus();
}

function cmExitModalFullscreen(cm) {
  const wrap = cm.getWrapperElement();
  wrap.classList.remove("cm-modal-fullscreen");

  if (cm.__modalFS?.resizeHandler) {
    window.removeEventListener("resize", cm.__modalFS.resizeHandler);
    cm.__modalFS.resizeHandler = null;
  }
  const base = cm.__modalFS?.baseHeight ?? 560;
  cm.setSize("100%", base);
  cm.refresh();
}
