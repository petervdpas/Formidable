// utils/buttonUtils.js

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

export function disableButton(btn, state = true) {
  if (btn instanceof HTMLElement) {
    btn.disabled = state;
  }
}