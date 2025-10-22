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
    translateDOM();
    window.dispatchEvent(new Event("languagechange"));
    EventBus?.emit?.("i18n:changed", locale);
  } catch (err) {
    console.error(`[i18n] Failed to load locale '${locale}'`, err);
  }
}

/**
 * Translate a given key with fallback
 */
export function t(key, argsOrFallback = "", fallback = "") {
  let args = [];
  let fb = "";
  if (Array.isArray(argsOrFallback)) {
    args = argsOrFallback;
    fb = fallback;
  } else {
    fb = argsOrFallback;
  }

  let out = translations[key] ?? fb ?? key;
  if (args.length) {
    out = out.replace(/{(\d+)}/g, (m, i) =>
      args[i] !== undefined ? String(args[i]) : m
    );
  }
  return out;
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
    let value = t(key);

    const argsAttr = el.getAttribute("data-i18n-args");
    if (argsAttr) {
      try {
        const args = JSON.parse(argsAttr);
        value = value.replace(/{(\d+)}/g, (m, i) =>
          args[i] !== undefined ? String(args[i]) : m
        );
      } catch (e) {
        console.warn("[translateDOM] Invalid JSON in data-i18n-args:", argsAttr);
      }
    }

    if (value) el.textContent = value;
  }

  // title
  const titleElements = root.querySelectorAll("[data-i18n-title]");
  for (const el of titleElements) {
    const key = el.getAttribute("data-i18n-title");
    const value = t(key);
    if (value) el.setAttribute("title", value);
  }

  // aria-label
  const ariaElements = root.querySelectorAll("[data-i18n-aria]");
  for (const el of ariaElements) {
    const key = el.getAttribute("data-i18n-aria");
    const value = t(key);
    if (value) el.setAttribute("aria-label", value);
  }

  // placeholder (inputs & textareas)
  const phElements = root.querySelectorAll("[data-i18n-placeholder]");
  for (const el of phElements) {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = t(key);
    if (value) {
      el.setAttribute("placeholder", value); // attribute
      if ("placeholder" in el) el.placeholder = value; // property
    }
  }

  // (optional) value for elements like <option>, if you ever use it
  const valElements = root.querySelectorAll("[data-i18n-value]");
  for (const el of valElements) {
    const key = el.getAttribute("data-i18n-value");
    const value = t(key);
    if (value) el.setAttribute("value", value);
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
