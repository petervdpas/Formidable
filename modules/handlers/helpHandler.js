// modules/handlers/helpHandler.js

import { EventBus } from "../eventBus.js";

async function getUiLanguage() {
  try {
    const cfg = await window.api.config.loadUserConfig();
    return (cfg && cfg.language) || "en";
  } catch {
    return "en";
  }
}

export async function handleHelpList() {
  const lang = await getUiLanguage();
  return await window.api.help.listHelpTopics(lang);
}

export async function handleHelpGet(id) {
  if (typeof id !== "string") return null;
  const lang = await getUiLanguage();
  return await window.api.help.getHelpTopic({ id, lang });
}
