// utils/linkBehavior.js

import { EventBus } from "../modules/eventBus.js";

function hasBridge() {
  return !!(window.api && window.api.system && window.api.system.openExternal);
}

export function wireLinkBehavior(rootEl) {
  if (!rootEl) return;

  rootEl.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !rootEl.contains(a)) return;

    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    if (href.startsWith("formidable://")) {
      e.preventDefault();
      EventBus.emit("link:formidable:navigate", { link: href });
      return;
    }

    const isHttp = /^https?:\/\//i.test(href);
    if (!isHttp) return;

    const wantTab = a.dataset.open === "tab";
    if (hasBridge()) {
      e.preventDefault();
      EventBus.emit("link:external:open", {
        url: href,
        variant: wantTab ? "tab" : "external",
      });
    } else {
      a.setAttribute("target", a.getAttribute("target") || "_blank");
      a.setAttribute("rel", a.getAttribute("rel") || "noopener noreferrer");
    }
  });
}
