// utils/i18n.js

let currentLocale = "en";
let translations = {};

/**
 * Dynamically load locale file (e.g., i18n/en.js)
 */
export async function loadLocale(locale = "en") {
  try {
    translations = (await import(`../i18n/${locale}.js`)).default;
    currentLocale = locale;
  } catch (err) {
    console.error(`[i18n] Failed to load locale '${locale}'`, err);
  }
}

/**
 * Translate a given key with fallback
 */
export function t(key, fallback = "") {
  let translation = translations[key] || fallback || key;
  return translation;
}

/**
 * Lowercase variant of translation
 */
export function tLow(key, fallback = "") {
  return t(key, fallback).toLowerCase();
}

/**
 * Uppercase variant of translation
 */
export function tUp(key, fallback = "") {
  return t(key, fallback).toUpperCase();
}

/**
 * Apply translations to all elements with [data-i18n]
 */
export function translateDOM(root = document.body) {
  const elements = root.querySelectorAll("[data-i18n]");
  for (const el of elements) {
    const key = el.getAttribute("data-i18n");
    const value = t(key);
    if (value) el.textContent = value;
  }

  const titleElements = root.querySelectorAll("[data-i18n-title]");
  for (const el of titleElements) {
    const key = el.getAttribute("data-i18n-title");
    const value = t(key);
    if (value) el.setAttribute("title", value);
  }
}
