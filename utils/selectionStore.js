// utils/selectionStore.js

// Generic caret/selection capture + restore + insert for <input>/<textarea>/contentEditable

export const SelectionStore = (() => {
  let snap = null;

  const INPUT_TYPES = /^(text|search|url|tel|password|email|number)$/i;

  function isTextControl(el) {
    return (
      el &&
      (
        el.tagName === "TEXTAREA" ||
        (el.tagName === "INPUT" && INPUT_TYPES.test(el.type))
      )
    );
  }

  function capture(target = document.activeElement) {
    snap = null;
    if (!target) return null;

    // ignore if element is gone, disabled, or readonly (you may want to allow readonly)
    if (!document.contains(target) || target.disabled) return null;

    if (isTextControl(target)) {
      snap = {
        kind: "input",
        el: target,
        start: target.selectionStart ?? 0,
        end: target.selectionEnd ?? 0,
        dir: target.selectionDirection || "none",
        scrollTop: target.scrollTop,
      };
    } else if (target.isContentEditable) {
      const sel = getSelection();
      if (!sel || !sel.rangeCount) return null;
      snap = {
        kind: "ce",
        el: target,
        range: sel.getRangeAt(0).cloneRange(),
      };
    }
    return snap;
  }

  function restore() {
    if (!snap) return false;
    const { el } = snap;
    if (!el || !document.contains(el)) return false;

    el.focus();

    if (snap.kind === "input") {
      const { start, end, dir, scrollTop } = snap;
      try {
        el.setSelectionRange(start, end, dir);
      } catch (_) {
        // some inputs (type=number) don’t support selection
        return false;
      }
      // restore scroll position for long textareas
      if (typeof scrollTop === "number") el.scrollTop = scrollTop;
      return true;
    }

    if (snap.kind === "ce") {
      const sel = getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(snap.range);
      return true;
    }

    return false;
  }

  function insertText(text) {
    if (!restore()) return false;

    const el = document.activeElement;

    if (isTextControl(el)) {
      const a = el.selectionStart ?? 0;
      const b = el.selectionEnd ?? 0;
      const before = el.value.slice(0, a);
      const after  = el.value.slice(b);
      el.value = before + text + after;

      const caret = a + text.length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    if (el && el.isContentEditable) {
      const sel = getSelection();
      if (!sel || !sel.rangeCount) return false;
      const r = sel.getRangeAt(0);
      r.deleteContents();
      r.insertNode(document.createTextNode(text));
      // place caret after inserted node
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
      return true;
    }

    return false;
  }

  function replaceSelection(text) {
    // alias that semantically reads better
    return insertText(text);
  }

  function clear() {
    snap = null;
  }

  // Helpers you can compose with UI
  function attachTriggerKeepingFocus(triggerEl, openFn) {
    // capture BEFORE focus changes, and prevent default so editor keeps focus
    triggerEl.addEventListener("mousedown", (e) => {
      capture();
      // Keep focus on the current editor (don’t let the button steal it)
      e.preventDefault();
    });
    triggerEl.addEventListener("click", (e) => {
      openFn?.(e);
    });
  }

  function preventPopupFocusSteal(containerEl) {
    // stop mousedown within popup from moving focus away from editor
    containerEl.addEventListener("mousedown", (e) => e.preventDefault(), { capture: true });
  }

  return {
    capture,
    restore,
    insertText,
    replaceSelection,
    clear,
    attachTriggerKeepingFocus,
    preventPopupFocusSteal,
    // optional: expose the last snapshot (read-only)
    get snapshot() { return snap; },
  };
})();
