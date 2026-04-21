// modules/gigotSyncModal.js
// The GiGot-in-Formidable sync surface as a split modal (sibling of
// gitControlModal). Left pane = sync controls (status banner, mirror
// destinations, Sync/Refresh buttons). Right pane = scrollable
// History (recent commits from the git log). Formidable is used by
// a 15-person team; every UX choice here optimizes for multi-writer
// cooperation (see memory: formidable_team_usage).

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

function extractDests(res) {
  if (!res || !res.ok) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.destinations)) return d.destinations;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

function extractLogEntries(res) {
  if (!res || !res.ok) return [];
  const d = res.data;
  if (Array.isArray(d?.entries)) return d.entries;
  if (Array.isArray(d)) return d;
  return [];
}

function relativeTime(iso) {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now - then;
  if (Number.isNaN(diffMs)) return iso;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString();
}

/**
 * Resolve profile → conn once, share across both panes. Each pane is
 * self-contained after construction (owns its DOM, exposes refresh()
 * for external triggers like "sync just finished").
 */
export async function getGigotSyncContext() {
  const cfg = await reloadUserConfig();
  return {
    conn: resolveGigotConn(cfg),
    contextFolder: cfg?.context_folder || "",
  };
}

// ─────────────────────────────────────────────────────────
// Left pane — status + mirror destinations + actions
// ─────────────────────────────────────────────────────────
export function buildGigotSyncLeftPane({ conn, contextFolder, onSyncDone }) {
  const node = document.createElement("div");
  node.className = "gigot-sync-left";

  const statusBox = document.createElement("div");
  statusBox.className = "gigot-sync-status";
  node.appendChild(statusBox);

  addContainerElement({
    parent: node,
    tag: "h3",
    textContent: t("modal.gigot.destinations") || "Mirror Destinations",
    i18nKey: "modal.gigot.destinations",
  });
  const destsList = document.createElement("div");
  destsList.className = "gigot-dests-list";
  node.appendChild(destsList);

  // Actions row: Sync (primary) / Refresh / inline status
  const actionsRow = document.createElement("div");
  actionsRow.className = "modal-form-row gigot-actions-row";

  const syncBtn = createButton({
    text: t("modal.gigot.sync") || "Sync",
    i18nKey: "modal.gigot.sync",
    identifier: "gigot-sync",
    className: "btn-primary",
    onClick: () => syncNow(),
  });
  actionsRow.appendChild(syncBtn);

  const refreshBtn = createButton({
    text: t("modal.gigot.refresh") || "Refresh",
    i18nKey: "modal.gigot.refresh",
    identifier: "gigot-refresh",
    onClick: () => repaint(),
  });
  actionsRow.appendChild(refreshBtn);

  const syncOut = document.createElement("span");
  syncOut.id = "gigot-sync-out";
  syncOut.className = "label-subtext gigot-sync-out";
  actionsRow.appendChild(syncOut);

  node.appendChild(actionsRow);

  async function syncNow() {
    syncBtn.disabled = true;
    refreshBtn.disabled = true;
    syncOut.textContent = t("modal.gigot.syncing") || "Syncing…";
    syncOut.className = "label-subtext gigot-sync-out";

    const res = await callBus("gigot:sync-local", { conn, contextFolder });

    syncBtn.disabled = false;
    refreshBtn.disabled = false;

    if (res?.ok) {
      const v = (res.data?.version || "").slice(0, 7);
      const pushed = res.data?.pushed ?? 0;
      const pulled = res.data?.pulled ?? 0;
      const vTag = v ? " · " + v : "";
      if (res.data?.noop) {
        syncOut.textContent = `${t("modal.gigot.sync.uptodate") || "Already in sync"}${vTag}`;
      } else {
        syncOut.textContent = `${
          t("modal.gigot.sync.ok") || "Synced"
        } · ↑${pushed} ↓${pulled}${vTag}`;
      }
      syncOut.classList.add("ok");
      await repaint();
      if (typeof onSyncDone === "function") await onSyncDone();
    } else {
      const stage = res?.stage ? ` (${res.stage})` : "";
      syncOut.textContent = `${t("modal.gigot.sync.fail") || "Sync failed"}${stage}: ${
        res?.error || "unknown"
      }`;
      syncOut.classList.add("error");
    }
  }

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
      statusBox.textContent = `${t("modal.gigot.connected") || "Connected"}: ${name}`;
    } else {
      statusBox.className = "gigot-sync-status error";
      statusBox.textContent = `${t("modal.gigot.failed") || "Connection failed"}: ${
        statusRes?.error || "unknown"
      }`;
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

    if (d.url) {
      addContainerElement({
        parent: card,
        tag: "div",
        className: "gigot-dest-url",
        textContent: d.url,
      });
    }

    if (d.last_sync_at) {
      addContainerElement({
        parent: card,
        tag: "div",
        className: "gigot-dest-meta",
        textContent: new Date(d.last_sync_at).toLocaleString(),
      });
    }

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

  return {
    node,
    init: () => repaint(),
  };
}

// ─────────────────────────────────────────────────────────
// Right pane — History (scrollable commit log)
// ─────────────────────────────────────────────────────────
export function buildGigotSyncRightPane({ conn }) {
  const node = document.createElement("div");
  node.className = "gigot-sync-right";

  addContainerElement({
    parent: node,
    tag: "h3",
    textContent: t("modal.gigot.history") || "History",
    i18nKey: "modal.gigot.history",
    className: "gigot-history-heading",
  });

  const scroller = document.createElement("div");
  scroller.className = "gigot-history-scroll";
  node.appendChild(scroller);

  async function repaint() {
    scroller.innerHTML = "";
    addContainerElement({
      parent: scroller,
      tag: "div",
      className: "gigot-history-loading",
      textContent: t("modal.gigot.loading") || "Loading…",
    });

    const res = await callBus("gigot:log", { conn, limit: 50 });

    scroller.innerHTML = "";
    if (!res?.ok) {
      addContainerElement({
        parent: scroller,
        tag: "div",
        className: "gigot-history-error",
        textContent: `${t("modal.gigot.history.fail") || "Log failed"}: ${
          res?.error || "unknown"
        }`,
      });
      return;
    }

    const entries = extractLogEntries(res);
    if (entries.length === 0) {
      addContainerElement({
        parent: scroller,
        tag: "div",
        className: "gigot-history-empty",
        textContent: t("modal.gigot.history.empty") || "No commits yet.",
      });
      return;
    }

    for (const e of entries) {
      scroller.appendChild(renderHistoryRow(e));
    }
  }

  function renderHistoryRow(entry) {
    const row = document.createElement("div");
    row.className = "gigot-history-row";

    const sha = (entry.hash || "").slice(0, 7);
    const shaEl = document.createElement("span");
    shaEl.className = "gigot-history-sha";
    shaEl.textContent = sha;
    row.appendChild(shaEl);

    const msg = (entry.message || "").split("\n")[0];
    const msgEl = document.createElement("span");
    msgEl.className = "gigot-history-msg";
    msgEl.textContent = msg;
    msgEl.title = entry.message || "";
    row.appendChild(msgEl);

    const metaEl = document.createElement("span");
    metaEl.className = "gigot-history-meta";
    const who = entry.author || "unknown";
    const when = entry.date ? relativeTime(entry.date) : "";
    metaEl.textContent = `${who}${when ? " · " + when : ""}`;
    metaEl.title = entry.date || "";
    row.appendChild(metaEl);

    return row;
  }

  return {
    node,
    init: () => repaint(),
    refresh: () => repaint(),
  };
}
