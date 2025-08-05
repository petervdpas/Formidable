// utils/i18n.js

const options = [
  { value: "en" },
  { value: "nl" },
  // more...
];

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
 * Translate with dynamic key extension
 */
export function tKey(base, extension, fallback = "") {
  const fullKey = base + extension;
  return t(fullKey, fallback);
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
  // textContent
  const elements = root.querySelectorAll("[data-i18n]");
  for (const el of elements) {
    const key = el.getAttribute("data-i18n");
    const value = t(key);
    if (value) el.textContent = value;
  }

  // title attribute
  const titleElements = root.querySelectorAll("[data-i18n-title]");
  for (const el of titleElements) {
    const key = el.getAttribute("data-i18n-title");
    const value = t(key);
    if (value) el.setAttribute("title", value);
  }

  // aria-label attribute
  const ariaElements = root.querySelectorAll("[data-i18n-aria]");
  for (const el of ariaElements) {
    const key = el.getAttribute("data-i18n-aria");
    const value = t(key);
    if (value) el.setAttribute("aria-label", value);
  }
}

/**
 * Return a list of available languages with translated labels
 */
export function getAvailableLanguages() {
  return options.map(({ value }) => ({
    value,
    label: t(`lang.${value}`),
  }));
}