// utils/transformationUtils.js

import { EventBus } from "../modules/eventBus.js";
import { getUserConfig } from "./configUtil.js";

/**
 * Retrieves a value at a given key path (supports dot notation).
 */
export function getValueAtKey(source, keyPath) {
  if (!source || typeof source !== "object") return undefined;
  if (typeof keyPath !== "string" || keyPath.trim() === "") return undefined;

  return keyPath
    .split(".")
    .reduce(
      (obj, key) =>
        obj && typeof obj === "object" && key in obj ? obj[key] : undefined,
      source
    );
}

/**
 * Checks if a value exists at a given key path.
 */
export function hasKeyPath(source, keyPath) {
  return getValueAtKey(source, keyPath) !== undefined;
}

/**
 * Sets a value at a given key path (supports dot notation).
 * Creates intermediate objects as needed.
 *
 * @param {Object} source
 * @param {string} keyPath
 * @param {*} value
 * @param {string} [mode="replace"] - "replace" or "preserve"
 * @returns {Object} The modified source (or a new object if input was invalid)
 */
export function setValueAtKey(source, keyPath, value, mode = "replace") {
  if (typeof keyPath !== "string" || keyPath.trim() === "") return source ?? {};
  if (!source || typeof source !== "object") source = {};

  const keys = keyPath.split(".");
  let current = source;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (i === keys.length - 1) {
      const exists = key in current;
      if (mode === "preserve" && exists && current[key] !== undefined) {
        return source;
      }
      current[key] = value;
    } else {
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
  }

  return source;
}

/**
 * Removes a key at a given path (supports dot notation).
 *
 * @param {Object} source
 * @param {string} keyPath
 * @returns {Object}
 */
export function removeKeyAtPath(source, keyPath) {
  if (!source || typeof source !== "object") return source;
  if (typeof keyPath !== "string" || keyPath.trim() === "") return source;

  const keys = keyPath.split(".");
  const lastKey = keys.pop();
  const parent = getValueAtKey(source, keys.join("."));

  if (parent && typeof parent === "object" && lastKey in parent) {
    delete parent[lastKey];
  }

  return source;
}

/**
 * Render markdown output from a given data + template combo.
 * Requires both arguments to be valid objects.
 */
export async function renderMarkdown(template, data) {
  if (!template || !data) {
    console.warn(
      "[transform] renderMarkdownFromTemplateData requires both template and data objects."
    );
    return null;
  }

  try {
    const markdown = await EventBus.emitWithResponse("transform:markdown", {
      template,
      data,
      filePrefix: false,
    });
    return markdown;
  } catch (err) {
    console.warn("[transform] Failed to render markdown:", err);
    return null;
  }
}

export async function parseFrontmatter(markdown = "") {
  return EventBus.emitWithResponse("transform:parseFrontmatter", markdown);
}

export async function buildFrontmatter(data = {}, body = "") {
  return EventBus.emitWithResponse("transform:buildFrontmatter", {
    data,
    body,
  });
}

export async function filterFrontmatter(data = {}, keepKeys = []) {
  return EventBus.emitWithResponse("transform:filterFrontmatter", {
    data,
    keepKeys,
  });
} 

/**
 * Evaluates a sidebar expression and returns rich output.
 * Always attempts evaluation; caller decides whether to use it.
 */
export async function evaluateExpression({
  expr,
  context,
  fallbackId,
  throwOnError = false,
}) {
  if (!expr || !context) {
    if (throwOnError) throw new Error("Missing expr or context");
    return fallbackId ? { text: fallbackId } : null;
  }

  try {
    const parsed = await EventBus.emitWithResponse("transform:parseMiniExpr", {
      expr,
      context,
    });

    if (typeof parsed === "object" && parsed !== null) {
      return {
        text: parsed.text ?? fallbackId,
        ...parsed,
      };
    }

    if (throwOnError) throw new Error("Parsed result is invalid");
    return fallbackId ? { text: fallbackId } : null;

  } catch (err) {
    console.warn("[EXPRESSION] Failed:", err);
    if (throwOnError) throw err;
    return fallbackId ? { text: fallbackId } : null;
  }
}