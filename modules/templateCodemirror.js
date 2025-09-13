// modules/templateCodemirror.js
import { EventBus } from "./eventBus.js";
import { getCurrentTheme } from "./themeToggle.js";

// Compute theme *at call*, not at import
const THEME = () => (getCurrentTheme() === "dark" ? "monokai" : "eclipse");

const registry = {
  main: null,
  inlines: new Set(),
};

function refreshWhenVisible(cm, wrapper, heightPx) {
  let disposed = false;
  const doRefresh = () => {
    if (disposed) return;
    // avoid touching a detached instance
    const wrap = cm.getWrapperElement?.();
    if (!wrap || !wrap.isConnected) return;
    cm.setSize("100%", heightPx);
    cm.refresh();
  };

  if (wrapper && wrapper.offsetParent !== null && wrapper.clientHeight > 0) {
    requestAnimationFrame(doRefresh);
    return () => {
      disposed = true;
    };
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        doRefresh();
      }
    },
    { threshold: 0 }
  );
  if (wrapper) io.observe(wrapper);

  const onVis = () => {
    if (document.visibilityState === "visible") doRefresh();
  };
  document.addEventListener("visibilitychange", onVis);
  const onResize = () => doRefresh();
  window.addEventListener("resize", onResize);

  // give caller a way to cancel if pane is torn down early
  return () => {
    disposed = true;
    try {
      io.disconnect();
    } catch {}
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", onResize);
  };
}

function applyTheme(cm) {
  if (!cm) return;
  cm.setOption("theme", THEME());
  requestAnimationFrame(() => cm.refresh());
}

// ── Listen once for theme changes from your theme toggle module
let subscribedTheme = false;
function ensureThemeSubscription() {
  if (subscribedTheme) return;
  subscribedTheme = true;

  EventBus.on?.("theme:changed", () => {
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

  if (main?.dispose) main.dispose();

  if (typeof CodeMirror === "undefined") {
    console.warn("CodeMirror not available");
    return null;
  }

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

  // Set buffer immediately…
  main.cm.setValue(initialValue || textarea.value || "");
  // …but defer sizing/refresh until the wrapper is actually visible
  const cancelVisRefresh = refreshWhenVisible(main.cm, wrapper, COMPACT_H);

  main.wrapper = wrapper;
  registry.main = main.cm;

  main.cm.on("change", () => main.cm.save());
  main.cm.on("blur", () => main.cm.save());

  // expose a tiny cleanup API
  main.dispose = () => {
    cancelVisRefresh?.();
    try {
      main.cm.save();
    } catch {}
    try {
      main.cm.toTextArea();
    } catch {}
    registry.main = null;
    main.cm = null;
    main.wrapper = null;
  };

  return main.cm;
}

export function getEditor() {
  return main.cm;
}

export function disposeMainEditor() {
  if (main?.dispose) main.dispose();
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
    height = 120,
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

  const wrap = cm.getWrapperElement();
  wrap?.classList.add("cm-inline");
  // critical in flex rows: allow the editor to shrink to the input column
  if (wrap) wrap.style.minWidth = "0";

  cm.setSize("100%", height);
  requestAnimationFrame(() => {
    cm.refresh();
    cm.setSize("100%", height);
  });

  cm.on("change", () => {
    cm.save();
    try {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } catch {}
  });

  registry.inlines.add(cm);

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
    cm.addKeyMap({
      F11: (c) => {
        c.save();
        c.toggleModalFullscreen();
        return true;
      },
      Esc: (c) => {
        if (c.isModalFullscreen()) c.exitModalFullscreen();
        return true;
      },
    });
  }

  return cm;
}

export function destroyInlineCodeMirror(cm) {
  if (!cm) return null;

  // Untrack editor
  registry.inlines.delete(cm);

  // Leave fullscreen cleanly
  if (cm.__modalFS && cm.isModalFullscreen?.()) cm.exitModalFullscreen();

  const wrap = cm.getWrapperElement?.();
  // best-effort: original textarea
  const ta =
    (cm.getTextArea && cm.getTextArea()) ||
    cm.display?.input?.textarea ||
    null;

  cm.save();
  cm.toTextArea(); // puts textarea back

  // Only remove wrapper if it no longer hosts the textarea
  if (wrap && wrap.isConnected && (!ta || !wrap.contains(ta))) {
    try { wrap.remove(); } catch {}
  }
  return ta; // let caller rebind dom.default
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
  const body = cm.__modalFS.body;

  if (!cm.__modalFS.placeholder) {
    cm.__modalFS.placeholder = document.createComment("cm-placeholder");
    cm.__modalFS.hostParent = wrap.parentNode;
    cm.__modalFS.hostNext = wrap.nextSibling;
    cm.__modalFS.hostParent.insertBefore(
      cm.__modalFS.placeholder,
      cm.__modalFS.hostNext
    );
  }

  cm.__modalFS.hadFocus = cm.hasFocus && cm.hasFocus();
  cm.__modalFS.cursor = cm.getCursor();
  cm.__modalFS.scroll = cm.getScrollInfo();

  body.classList.add("cm-fs-active");
  body.appendChild(wrap);
  wrap.classList.add("cm-modal-fullscreen");

  const fit = () => {
    cm.setSize(body.clientWidth, body.clientHeight);
    cm.refresh();
  };
  fit();

  cm.__modalFS.resizeHandler = fit;
  window.addEventListener("resize", fit);
  cm.__modalFS.ro = new ResizeObserver(fit);
  cm.__modalFS.ro.observe(body);

  cm.focus();
}

function cmExitModalFullscreen(cm) {
  const wrap = cm.getWrapperElement();
  const fs = cm.__modalFS || {};

  wrap.classList.remove("cm-modal-fullscreen");
  fs.body?.classList.remove("cm-fs-active");

  if (fs.hostParent) {
    if (fs.hostNext && fs.hostNext.parentNode === fs.hostParent) {
      fs.hostParent.insertBefore(wrap, fs.hostNext);
    } else if (fs.placeholder && fs.placeholder.parentNode === fs.hostParent) {
      fs.hostParent.insertBefore(wrap, fs.placeholder);
    } else {
      fs.hostParent.appendChild(wrap);
    }
  }
  if (fs.placeholder && fs.placeholder.parentNode) {
    fs.placeholder.parentNode.removeChild(fs.placeholder);
    fs.placeholder = null;
  }

  if (fs.ro) {
    fs.ro.disconnect();
    fs.ro = null;
  }
  if (fs.resizeHandler) {
    window.removeEventListener("resize", fs.resizeHandler);
    fs.resizeHandler = null;
  }

  const base = fs.baseHeight ?? 120;
  cm.setSize("100%", base);
  if (fs.cursor) cm.setCursor(fs.cursor);
  if (fs.scroll) cm.scrollTo(fs.scroll.left, fs.scroll.top);

  requestAnimationFrame(() => {
    cm.focus();
    try {
      cm.scrollIntoView(null, 40);
    } catch {}
  });
}
