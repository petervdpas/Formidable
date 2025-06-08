// modules/handlers/profileHandler.js

import { EventBus } from "../eventBus.js";
import { clearHighlighted, highlightSelected } from "../../utils/domUtils.js";

export async function handleProfileHighlighted({ listId, name }) {
  const container = document.getElementById(listId);
  if (!container || !name) return;

  const normalized = name.toLowerCase();

  const match = Array.from(container.children).find(
    (el) =>
      el.textContent.trim().toLowerCase() === normalized ||
      el.dataset?.value?.toLowerCase() === normalized
  );

  if (match) {
    clearHighlighted(container);
    highlightSelected(container, name, { click: false });
  }
}
