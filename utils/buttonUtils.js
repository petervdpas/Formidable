// utils/buttonUtils.js

import { EventBus } from "../modules/eventBus.js";
import { t } from "./i18n.js";

// Poly-ish: CSS.escape fallback
const cssEscape = (s) =>
  (window.CSS && typeof CSS.escape === "function") ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_\-]/g, "\\$&");

export function createStatusButtonConfig({
  id,
  label,
  titleKey = "",
  title = "",
  className = "",
  onClick,
  ariaKey = "",
  ariaLabel = "",
  attributes = {},
}) {
  return {
    id,
    label,
    title: titleKey ? t(titleKey) : title,
    className,
    onClick,
    ariaLabel: ariaKey ? t(ariaKey) : ariaLabel,
    attributes,
  };
}

export function createStatusButton(container, cfg = {}) {
  if (!container) {
    EventBus.emit("logging:warning", [
      "[StatusButtons] Missing container element for createStatusButton.",
    ]);
    return null;
  }

  const {
    id,
    label = "•",
    title = "",
    className = "",
    onClick,
    ariaLabel = "",
    attributes = {},
  } = cfg;

  if (!id) {
    EventBus.emit("logging:warning", [
      "[StatusButtons] createStatusButton requires an 'id'.",
    ]);
    return null;
  }

  if (container.querySelector(`#${cssEscape(id)}`)) {
    EventBus.emit("logging:warning", [
      `[StatusButtons] Button '${id}' already exists; skipping.`,
    ]);
    return container.querySelector(`#${cssEscape(id)}`);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = id;
  btn.className = `statusbar-button ${className}`.trim();
  btn.title = title;
  btn.textContent = label;

  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);

  // apply extra attrs (e.g., data-* hooks)
  for (const [k, v] of Object.entries(attributes)) {
    btn.setAttribute(k, v);
  }

  if (typeof onClick === "function") {
    btn.addEventListener("click", (e) => onClick(e, btn));
  }

  container.appendChild(btn);
  return btn;
}

export function createButton({
  text,
  i18nKey = "",
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
  ariaLabel = "",
}) {
  const btn = document.createElement("button");

  btn.textContent = text;
  btn.id = identifier
    ? `btn-${identifier}`
    : `btn-${text.toLowerCase().replace(/\s+/g, "-")}`;
  btn.className = `btn ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  if (i18nKey) {
    btn.setAttribute("data-i18n", i18nKey);
  }

  if (ariaLabel) {
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("role", "button");
    btn.setAttribute("data-tooltip", ariaLabel);
  }

  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}

export function createIconButton({
  iconClass = "",
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
  ariaLabel = "",
  i18nTitle = "",
  i18nAria = "",
}) {
  const btn = document.createElement("button");
  btn.id = identifier ? `btn-${identifier}` : `btn-icon-button`;
  btn.className = `btn icon-button ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  // Icon element
  const icon = document.createElement("i");
  icon.className = iconClass;
  btn.appendChild(icon);

  // Handle i18nTitle
  if (i18nTitle) {
    const translatedTitle = t(i18nTitle);
    btn.setAttribute("title", translatedTitle);
    btn.setAttribute("data-i18n-title", i18nTitle);
    btn.setAttribute("data-tooltip", translatedTitle);
  }

  // Handle i18nAria
  if (i18nAria) {
    const translatedAria = t(i18nAria);
    btn.setAttribute("aria-label", translatedAria);
    btn.setAttribute("data-i18n-aria", i18nAria);
  }

  // Fallback aria-label and tooltip if no i18n keys
  if (!i18nAria && ariaLabel) {
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("data-tooltip", ariaLabel);
  }

  // Always add role
  btn.setAttribute("role", "button");

  // Apply extra attributes last
  for (const [key, value] of Object.entries(attributes)) {
    btn.setAttribute(key, value);
  }

  return btn;
}

export function buildButtonGroup(...args) {
  let extraClass = "";
  if (typeof args[args.length - 1] === "string") {
    extraClass = args.pop();
  }

  const group = document.createElement("div");
  group.className = `button-group${extraClass ? " " + extraClass : ""}`;

  args.forEach((btn) => {
    if (btn instanceof HTMLElement) group.appendChild(btn);
  });

  return group;
}

export async function createToggleButtons(handlers, variantMap) {
  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  const useIcon = config.show_icon_buttons;
  const result = {};

  for (const key in handlers) {
    const ButtonFn = useIcon ? variantMap.icon?.[key] : variantMap.label?.[key];

    if (typeof ButtonFn === "function") {
      result[key] = ButtonFn(handlers[key]);
    } else {
      console.warn(
        `[createToggleButtons] Missing button factory for "${key}" in variantMap.`
      );
    }
  }

  return result;
}

export function disableButton(btn, state = true) {
  if (btn instanceof HTMLElement) {
    btn.disabled = state;
  }
}

/* Specialized button creators */
export function createCancelButton({
  text = null,
  onClick = () => {},
  id = "modal-cancel",
  className = "btn-default",
}) {
  const fallbackKey = "standard.cancel";
  const label = text ?? t(fallbackKey, "Cancel");

  return createButton({
    text: label,
    i18nKey: text ? "" : fallbackKey, // only set if using default
    className,
    identifier: id,
    onClick,
    ariaLabel: label,
  });
}

export function createConfirmButton({
  text = null,
  onClick = () => {},
  id = "modal-confirm",
  className = "btn-okay",
  variant = "okay",
}) {
  const fallbackKey = "standard.confirm";
  const label = text ?? t(fallbackKey, "Confirm");

  return createButton({
    text: label,
    i18nKey: text ? "" : fallbackKey, // only set if using default
    className: `btn-${variant} ${className}`.trim(),
    identifier: id,
    onClick,
    ariaLabel: label,
  });
}
