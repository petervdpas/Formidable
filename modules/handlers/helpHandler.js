// modules/handlers/helpHandler.js

import { EventBus } from "../eventBus.js";

export async function handleHelpList() {
  return await window.api.help.listHelpTopics();
}

export async function handleHelpGet(id) {
  if (typeof id !== "string") return null;
  return await window.api.help.get(id);
}
