// modules/gigotSyncModal.js
// Slice 2 of the GiGot-in-Formidable integration. Shows the active
// GiGot connection + mirror destinations with a one-click retry per
// destination. Sibling of gitControlModal.js but deliberately much
// smaller — no branches, no commit, no push/pull yet. Those land in
// the next slice once gigotManager grows its push/pull surface.

import { EventBus } from "./eventBus.js";
import { createButton } from "../utils/buttonUtils.js";
import { addContainerElement } from "../utils/elementBuilders.js";
import { t } from "../utils/i18n.js";
import { resolveGigotConn } from "../utils/backendUtils.js";
import { reloadUserConfig } from "../utils/configUtil.js";

/** Emit a gigot:* event and resolve with the handler's callback result. */
function callBus(event, payload) {
  return new Promise((resolve) => {
    EventBus.emit(event, { ...payload, callback: resolve });
  });
}

/** Pull the destinations array from whatever envelope GiGot returns. */
function extractDests(res) {
  if (!res || !res.ok) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.destinations)) return d.destinations;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

export async function renderGigotSyncBody(container) {
  container.innerHTML = "";
  const cfg = await reloadUserConfig();
  const conn = resolveGigotConn(cfg);

  // Connection status box
  const statusBox = document.createElement("div");
  statusBox.className = "gigot-sync-status";
  container.appendChild(statusBox);

  // Destinations heading + list
  addContainerElement({
    parent: container,
    tag: "h3",
    textContent: t("modal.gigot.destinations") || "Mirror Destinations",
    i18nKey: "modal.gigot.destinations",
  });
  const destsList = document.createElement("div");
  destsList.className = "gigot-dests-list";
  container.appendChild(destsList);

  // Actions row
  const actionsRow = document.createElement("div");
  actionsRow.className = "modal-form-row";
  const refreshBtn = createButton({
    text: t("modal.gigot.refresh") || "Refresh",
    i18nKey: "modal.gigot.refresh",
    identifier: "gigot-refresh",
    onClick: () => repaint(),
  });
  actionsRow.appendChild(refreshBtn);
  container.appendChild(actionsRow);

  async function repaint() {
    statusBox.className = "gigot-sync-status loading";
    statusBox.textContent = t("modal.gigot.loading") || "Loading…";
    destsList.innerHTML = "";
    refreshBtn.disabled = true;

    const [statusRes, destsRes] = await Promise.all([
      callBus("gigot:status", { conn }),
      callBus("gigot:list-destinations", { conn }),
    ]);

    refreshBtn.disabled = false;
    statusBox.innerHTML = "";

    if (statusRes?.ok) {
      const name = statusRes.data?.name || conn.repoName;
      statusBox.className = "gigot-sync-status ok";
      statusBox.textContent = `${
        t("modal.gigot.connected") || "Connected"
      }: ${name}`;
    } else {
      statusBox.className = "gigot-sync-status error";
      statusBox.textContent = `${
        t("modal.gigot.failed") || "Connection failed"
      }: ${statusRes?.error || "unknown"}`;
      return;
    }

    const dests = extractDests(destsRes);
    if (dests.length === 0) {
      addContainerElement({
        parent: destsList,
        tag: "div",
        className: "gigot-dests-empty",
        textContent:
          t("modal.gigot.destinations.empty") ||
          "No mirror destinations configured.",
        i18nKey: "modal.gigot.destinations.empty",
      });
      return;
    }

    for (const d of dests) {
      destsList.appendChild(renderDestCard(d, repaint));
    }
  }

  function renderDestCard(d, onRetryDone) {
    const card = document.createElement("div");
    card.className = "gigot-dest-card";

    // Header row: title (grows) + status pill + retry button
    const header = document.createElement("div");
    header.className = "gigot-dest-header";

    addContainerElement({
      parent: header,
      tag: "div",
      className: "gigot-dest-title",
      textContent: d.name || d.id || "(unnamed)",
    });

    const actions = document.createElement("div");
    actions.className = "gigot-dest-actions";

    const statusKey = d.last_sync_status || "never";
    addContainerElement({
      parent: actions,
      tag: "span",
      className: `gigot-dest-status ${statusKey}`,
      textContent: statusKey,
    });

    const retryBtn = createButton({
      text: t("modal.gigot.retry") || "Retry",
      i18nKey: "modal.gigot.retry",
      identifier: `gigot-retry-${d.id}`,
      onClick: async () => {
        retryBtn.disabled = true;
        retryBtn.textContent = t("modal.gigot.retrying") || "Retrying…";
        await callBus("gigot:sync-destination", { conn, id: d.id });
        await onRetryDone();
      },
    });
    actions.appendChild(retryBtn);

    header.appendChild(actions);
    card.appendChild(header);

    // URL (monospace, dim) — below the header
    if (d.url) {
      addContainerElement({
        parent: card,
        tag: "div",
        className: "gigot-dest-url",
        textContent: d.url,
      });
    }

    // Last-sync timestamp — small, below URL
    if (d.last_sync_at) {
      addContainerElement({
        parent: card,
        tag: "div",
        className: "gigot-dest-meta",
        textContent: new Date(d.last_sync_at).toLocaleString(),
      });
    }

    // Error (if any) — red, below the rest
    if (d.last_sync_error) {
      addContainerElement({
        parent: card,
        tag: "div",
        className: "gigot-dest-error",
        textContent: d.last_sync_error,
      });
    }

    return card;
  }

  await repaint();
}
