// modules/pollers/demoThemePulsePoller.js
import { EventBus } from "../eventBus.js";

export function startDemoThemePulsePoller() {
  const ID = "demo:theme-pulse";
  EventBus.emit("tasks:unregister", ID);
  EventBus.emit("tasks:register", {
    id: ID,
    interval: 10_000,
    immediate: false,
    condition: { type: "dom-exists", selector: "html[data-theme]" },
    fn: async () => {
      const html = document.documentElement;
      const current = (html.dataset.theme || "light").toLowerCase();
      const next = current === "dark" ? "light" : "dark";
      EventBus.emit("theme:toggle", next);
    },
  });
}