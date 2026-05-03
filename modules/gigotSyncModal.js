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

// shortenUrl mirrors the helper on GiGot's admin Repositories page
// so the destination title in the Formidable modal reads the same as
// the destination summary in the admin UI ("github.com/owner/repo"
// instead of the opaque server-generated id). Falls through to the
// raw URL on parse failure so we never display nothing.
function shortenUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\.git$/, "");
  } catch {
    return url;
  }
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

  // Mirror destinations are managed on the GiGot admin Repositories
  // page (see remote-sync.md §2.4 + §3.7 — adding a destination
  // requires the privacy-notice consent gesture, which deliberately
  // belongs outside Formidable's day-to-day surface). This pane is
  // read-only: it lists what's been configured server-side and
  // exposes one action per row, "Sync now", which fires
  // POST /api/repos/{name}/destinations/{id}/sync.
  addContainerElement({
    parent: node,
    tag: "h3",
    textContent: t("modal.gigot.destinations") || "Mirror Destinations",
    i18nKey: "modal.gigot.destinations",
  });
  const destsList = document.createElement("div");
  destsList.className = "gigot-dests-list";
  node.appendChild(destsList);

  // Actions row: Sync (primary) + inline status. No Refresh button —
  // the modal repaints on open and after every Sync, and reopening
  // is the explicit "fetch the latest from GiGot" gesture.
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

  const syncOut = document.createElement("span");
  syncOut.id = "gigot-sync-out";
  syncOut.className = "label-subtext gigot-sync-out";
  actionsRow.appendChild(syncOut);

  node.appendChild(actionsRow);

  async function syncNow() {
    syncBtn.disabled = true;
    syncOut.textContent = t("modal.gigot.syncing") || "Syncing…";
    syncOut.className = "label-subtext gigot-sync-out";

    const res = await callBus("gigot:sync-local", { conn, contextFolder });

    syncBtn.disabled = false;

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

  // Cached on each repaint so renderDestCard can decide whether the
  // manual "Sync now" button is allowed without re-asking the server.
  // Set from /api/repos/{name}/context's subscription.abilities — no
  // more inferring "I must have mirror because the destinations list
  // returned." If the bootstrap call ever fails we treat it as
  // no-abilities so we err on the side of NOT showing destructive UI.
  let currentAbilities = [];

  async function repaint() {
    statusBox.className = "gigot-sync-status loading";
    statusBox.textContent = t("modal.gigot.loading") || "Loading…";
    destsList.innerHTML = "";

    // Bootstrap first — one call returns user/subscription/repo so the
    // banner, the abilities gate, and the destinations summary all
    // come from a single source of truth.
    const ctxRes = await callBus("gigot:context", { conn });

    statusBox.innerHTML = "";

    if (!ctxRes?.ok) {
      currentAbilities = [];
      statusBox.className = "gigot-sync-status error";
      statusBox.textContent = `${t("modal.gigot.failed") || "Connection failed"}: ${
        ctxRes?.error || "unknown"
      }`;
      return;
    }

    const name = ctxRes.data?.repo?.name || conn.repoName;
    statusBox.className = "gigot-sync-status ok";
    statusBox.textContent = `${t("modal.gigot.connected") || "Connected"}: ${name}`;

    currentAbilities = Array.isArray(ctxRes.data?.subscription?.abilities)
      ? ctxRes.data.subscription.abilities
      : [];

    // Skip the destinations roundtrip when the bootstrap already
    // reported zero destinations — saves one call per repaint on
    // the common "freshly attached repo" case.
    const totalFromContext = ctxRes.data?.repo?.destinations?.total ?? null;
    if (totalFromContext === 0) {
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

    // Read split: any in-scope subscriber can list destinations even
    // without the mirror ability. The ability gates only the manual
    // "Sync now" button on each card (see renderDestCard).
    const destsRes = await callBus("gigot:list-destinations", { conn });
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

  // Read-only destination card. The only verb a Formidable-side caller
  // exposes is "Sync now" — fires
  // POST /api/repos/{name}/destinations/{id}/sync. All
  // configuration (URL, credential binding, enabled flag, removal)
  // happens on the GiGot admin Repositories page (remote-sync.md
  // §3.7's privacy-notice consent gesture lives there). Keeping
  // it that way means Formidable never has to know about credential
  // names, never duplicates the consent prompt, and matches the
  // single-source-of-truth rule — GiGot owns destinations, the
  // client only triggers them.
  function renderDestCard(d, onSyncDone) {
    const card = document.createElement("div");
    card.className = "gigot-dest-card";

    const header = document.createElement("div");
    header.className = "gigot-dest-header";

    // Title prefers the URL-derived shorthand (matches the GiGot
    // admin Repositories page summary). Fall back to a server-set
    // name field, then the destination id, so the card always has
    // some recognisable label even with malformed data. The full
    // URL still renders below in .gigot-dest-url.
    const titleText =
      shortenUrl(d.url) || d.name || d.id || "(unnamed)";
    addContainerElement({
      parent: header,
      tag: "div",
      className: "gigot-dest-title",
      textContent: titleText,
      attributes: { title: d.url || titleText },
    });

    const actions = document.createElement("div");
    actions.className = "gigot-dest-actions";

    // Auto-mirror ON: render the status pill (green "ok" / red "error" /
    // gray "never") — the pill *is* the auto-mirror indicator. Server
    // fans out the push on every accepted commit; no manual button.
    // Auto-mirror OFF + caller has `mirror` ability: render the manual
    // "Sync mirror" button (no pill — there's no auto-status to show).
    // Auto-mirror OFF + no ability: explicit read-only label.
    // Ability is taken from the bootstrap response (currentAbilities),
    // not inferred from "did the destinations list return".
    // Always render the auto-mirror badge: green when auto-mirror is
    // engaged (server fans out a push on every commit), orange when
    // it's off (the destination exists but won't auto-push). The
    // manual "Sync mirror" button only appears for users with the
    // `mirror` ability AND when auto-mirror is off — when auto is on,
    // there's nothing to manually trigger.
    addContainerElement({
      parent: actions,
      tag: "span",
      className: `gigot-dest-status ${d.enabled ? "ok" : "warn"}`,
      textContent: t("modal.gigot.destinations.auto") || "auto-mirror",
      i18nKey: "modal.gigot.destinations.auto",
    });

    if (!d.enabled && currentAbilities.includes("mirror")) {
      const syncBtn = createButton({
        text: t("modal.gigot.destinations.sync") || "Sync mirror",
        i18nKey: "modal.gigot.destinations.sync",
        identifier: `gigot-dest-sync-${d.id}`,
        className: "btn-primary",
        onClick: async () => {
          syncBtn.disabled = true;
          syncBtn.textContent =
            t("modal.gigot.destinations.syncing") || "Syncing…";
          await callBus("gigot:sync-destination", { conn, id: d.id });
          await onSyncDone();
        },
      });
      actions.appendChild(syncBtn);
    }

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
