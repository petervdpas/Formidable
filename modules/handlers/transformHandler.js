// modules/handlers/transformHandler.js

import { EventBus } from "../eventBus.js";

export async function handleRenderMarkdown(
  { data, template, filePrefix = true },
  callback
) {
  try {
    EventBus.emit("logging:default", [
      "[transformHandler] Rendering Markdown...",
    ]);
    const markdown = await window.api.transform.renderMarkdownTemplate(
      data,
      template,
      filePrefix
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

export async function handleParseMiniExpr({ expr, context }) {
  try {
    const result = await window.api.transform.parseMiniExpr(expr, context);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to parse miniExpr:",
      err,
    ]);
    return null;
  }
}

export async function handleParseFrontmatter(markdown = "") {
  try {
    const result = await window.api.transform.parseFrontmatter(markdown);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to parse frontmatter:",
      err,
    ]);
    return { frontmatter: null, body: markdown };
  }
}

export async function handleBuildFrontmatter({ data = {}, body = "" }) {
  try {
    const result = await window.api.transform.buildFrontmatter(data, body);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to build frontmatter:",
      err,
    ]);
    return body;
  }
}

export async function handleFilterFrontmatter({ data = {}, keepKeys = [] }) {
  try {
    const result = await window.api.transform.filterFrontmatter(data, keepKeys);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[transformHandler] Failed to filter frontmatter:",
      err,
    ]);
    return {};
  }
}
