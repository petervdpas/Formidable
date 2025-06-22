// modules/handlers/transformHandler.js

import { EventBus } from "../eventBus.js";

export async function handleRenderMarkdown({ data, template }, callback) {
  try {
    EventBus.emit("logging:default", [
      "[transformHandler] Rendering Markdown...",
    ]);
    const markdown = await window.api.transform.renderMarkdownTemplate(
      data,
      template
    );
    callback?.(markdown);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to render markdown:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleRenderHtml(markdown, callback) {
  try {
    EventBus.emit("logging:default", ["[transformHandler] Rendering Html..."]);
    const html = await window.api.transform.renderHtmlPreview(markdown);
    callback?.(html);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to render HTML:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleParseMiniExpr(expr, context, callback) {
  try {
    EventBus.emit("logging:default", [
      "[transformHandler] Parsing miniExpr...",
      expr,
      context,
    ]);
    const result = await window.api.transform.parseMiniExpr(expr, context);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to parse miniExpr:",
      err,
    ]);
    callback?.(null);
  }
}
