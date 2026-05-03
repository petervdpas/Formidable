// modules/handlers/journalHandler.js

import { EventBus } from "../eventBus.js";

async function run(where, callback, fn) {
  try {
    const res = await fn();
    if (res && res.ok === false) {
      EventBus.emit("logging:warning", [
        `[JournalHandler] ${where} failed: ${res.error}`,
      ]);
    }
    callback?.(res);
  } catch (err) {
    const msg = String(err?.message || err);
    EventBus.emit("logging:error", [`[JournalHandler] ${where} threw: ${msg}`]);
    callback?.({ ok: false, error: msg });
  }
}

export async function handleJournalPending({ callback }) {
  await run("pending", callback, () => window.api.journal.journalPending());
}

export async function handleJournalCursor({ callback }) {
  await run("cursor", callback, () => window.api.journal.journalCursor());
}

// Notification fired by pendingChangesPoller when the journal-derived
// pending count moves. The handler caches the latest value so any
// caller (sibling pollers, UI buttons) can read it synchronously
// without a fresh IPC round-trip. Subscribers that want push updates
// still attach via EventBus.on("journal:changed", ...) directly.
let lastKnownCount = 0;

export function handleJournalChanged(payload) {
  if (typeof payload?.count === "number") {
    lastKnownCount = payload.count;
  }
}

export function getLastKnownPending() {
  return lastKnownCount;
}
