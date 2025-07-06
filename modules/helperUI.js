// modules/helperUI.js

import { EventBus } from "./eventBus.js";

export async function renderHelp() {
  const container = document.getElementById("help-body");
  if (!container) return false;

  container.innerHTML = "<p>Loading help content...</p>";

  try {
    const topics = await EventBus.emitWithResponse("help:list");
    if (!Array.isArray(topics) || topics.length === 0) {
      container.innerHTML = "<p>No help topics available.</p>";
      return true;
    }

    const first = topics[0];
    const topic = await EventBus.emitWithResponse("help:get", first.id);
    if (!topic?.content) {
      container.innerHTML = "<p>Help topic failed to load.</p>";
      return true;
    }

    const html = await EventBus.emitWithResponse("transform:html", topic.content);
    container.innerHTML = `<div class="help-content">${html}</div>`;
    return true;
  } catch (err) {
    console.error("[Help] Failed to render help:", err);
    container.innerHTML = `<pre class="error">Render error: ${err.message}</pre>`;
    return false;
  }
}
