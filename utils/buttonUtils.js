// utils/buttonUtils.js

import { EventBus } from "../modules/eventBus.js";
import { t } from "./i18n.js";

export function createButton({
  text,
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
  iconClass = "", // ie. "fa fa-flag"
  className = "",
  identifier = "",
  onClick = () => {},
  disabled = false,
  attributes = {},
  ariaLabel = "",
}) {
  const btn = document.createElement("button");
  btn.id = identifier ? `btn-${identifier}` : `btn-icon-button`;
  btn.className = `btn icon-button ${className}`.trim();
  btn.disabled = disabled;
  btn.onclick = onClick;

  if (ariaLabel) {
    btn.setAttribute("aria-label", ariaLabel);
    btn.setAttribute("role", "button");
    btn.setAttribute("data-tooltip", ariaLabel);
  }

  // Icon element
  const icon = document.createElement("i");
  icon.className = iconClass;
  btn.appendChild(icon);

  // Set extra attributes
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
  text = t("button.cancel", "Cancel"),
  onClick = () => {},
  id = "modal-cancel",
  className = "btn-default",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}

export function createConfirmButton({
  text = t("button.confirm", "Confirm"),
  onClick = () => {},
  id = "modal-confirm",
  className = "btn-okay",
}) {
  return createButton({
    text,
    className,
    identifier: id,
    onClick,
  });
}