// modules/templateCodemirror.js

import { EventBus } from "./eventBus.js";
import { getCurrentTheme } from "./themeToggle.js";

let editor = null;
let editorWrapper = null;

// ─── CodeMirror Initializer ─────────────────────
export function initCodeMirror(textarea, initialValue = "") {
  if (editor) {
    editor.toTextArea();
  }

  const cmTheme = getCurrentTheme() === "dark" ? "monokai" : "eclipse";

  editor = CodeMirror.fromTextArea(textarea, {
    mode: "yaml",
    theme: cmTheme,
    lineNumbers: true,
    lineWrapping: true,
    scrollbarStyle: "native",
    viewportMargin: Infinity,
    autofocus: true,
  });

  editor.setValue(initialValue);

  requestAnimationFrame(() => {
    editor.refresh();
    editor.setSize("100%", "100%");
  });

  editorWrapper = textarea.closest(".editor-wrapper");
}

export function getEditor() {
  return editor;
}

export function getValue() {
  return editor?.getValue().trim() || "";
}

export function handleEditorKey(e) {
  if (!editorWrapper) return;

  EventBus.emit("logging:default", [
    `[YamlEditor] Key pressed: ctrl=${e.ctrlKey}, key=${e.key}`,
  ]);
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    EventBus.emit("logging:default", [
      "[YamlEditor] CTRL+ENTER pressed → toggle fullscreen",
    ]);
    EventBus.emit("screen:fullscreen", editorWrapper);
  }
  if (e.key === "Escape" && editorWrapper?.classList.contains("fullscreen")) {
    EventBus.emit("logging:default", [
      "[YamlEditor] ESC pressed → exit fullscreen",
    ]);
    EventBus.emit("screen:fullscreen", editorWrapper);
  }
}
