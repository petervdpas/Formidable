// modules/helperUI.js
import { EventBus } from "./eventBus.js";
import { applyExternalLinkBehavior } from "../utils/domUtils.js";

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

    // Build navigation
    const navHtml = topics
      .map(
        (t) =>
          `<button class="help-nav-btn" data-id="${t.id}">${t.title}</button>`
      )
      .join("");

    container.innerHTML = `
        <div class="help-nav">${navHtml}</div>
        <div class="help-scroll-container">
            <div class="help-content">Loading...</div>
        </div>
        `;

    const contentEl = container.querySelector(".help-content");
    const buttons = container.querySelectorAll(".help-nav-btn");

    async function loadTopic(id) {
      const topic = await EventBus.emitWithResponse("help:get", id);
      const html = await EventBus.emitWithResponse(
        "transform:html",
        topic.content
      );
      contentEl.innerHTML = html;

      applyExternalLinkBehavior(contentEl);

      contentEl.querySelectorAll("a[href^='#']").forEach((a) => {
        const targetId = a.getAttribute("href").slice(1);
        a.addEventListener("click", (e) => {
          e.preventDefault();
          loadTopic(targetId);
        });
      });

      // Highlight active button
      buttons.forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-id") === id);
      });

      // Scroll content back to top on topic change
      contentEl.scrollTop = 0;
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        loadTopic(id);
      });
    });

    const first = topics.find((t) => t.id === "index") || topics[0];
    if (first) await loadTopic(first.id);

    return true;
  } catch (err) {
    console.error("[Help] Failed to render help:", err);
    container.innerHTML = `<pre class="error">Render error: ${err.message}</pre>`;
    return false;
  }
}
