// modules/handlers/historyHandler.js

import { EventBus } from "../eventBus.js";

const LINK_RE = /^formidable:\/\/([^:]+):(.+)$/;

const History = {
  stack: [],
  index: -1,
  maxSize: 50,
  persist: false,
  suppressNextPush: false,

  init(cfg) {
    this.maxSize = cfg?.history?.max_size ?? 50;
    this.persist = !!cfg?.history?.persist;

    if (cfg?.history?.stack && Array.isArray(cfg.history.stack)) {
      this.stack = cfg.history.stack.slice(0, this.maxSize);
      const idx =
        typeof cfg.history.index === "number" ? cfg.history.index : -1;
      this.index = Math.min(Math.max(idx, -1), this.stack.length - 1);
    } else {
      this.stack = [];
      this.index = -1;
    }

    this._announce();
  },

  makeLink(template, storageEntry) {
    return `formidable://${template}:${storageEntry}`;
  },

  parseLink(link) {
    const m = LINK_RE.exec(String(link || ""));
    if (!m) return null;
    return { template: m[1], datafile: m[2] };
  },

  addLink(link, { replace = false } = {}) {
    if (!link) return;

    if (replace && this.index >= 0 && this.index < this.stack.length) {
      if (this.stack[this.index] === link) return;
      this.stack[this.index] = link;
    } else {
      if (this.stack[this.index] === link) return;

      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push(link);

      if (this.stack.length > this.maxSize) {
        this.stack.shift();
        this.index = this.stack.length - 1;
      } else {
        this.index++;
      }
    }

    this._announce();
  },

  add(template, storageEntry, opts = {}) {
    this.addLink(this.makeLink(template, storageEntry), opts);
  },

  back() {
    if (!this.canBack()) return null;
    this.index--;
    this._announce();
    return this.stack[this.index];
  },

  forward() {
    if (!this.canForward()) return null;
    this.index++;
    this._announce();
    return this.stack[this.index];
  },

  canBack() {
    return this.index > 0;
  },

  canForward() {
    return this.index < this.stack.length - 1;
  },

  snapshot() {
    return { stack: [...this.stack], index: this.index };
  },

  setSuppressNextPush() {
    this.suppressNextPush = true;
  },

  consumeSuppressNextPush() {
    const v = this.suppressNextPush;
    this.suppressNextPush = false;
    return v;
  },

  _announce() {
    EventBus.emit("history:state", {
      canBack: this.canBack(),
      canForward: this.canForward(),
    });
  },
};

async function persistIfEnabled() {
  const cfg = await new Promise((resolve) =>
    EventBus.emit("config:load", resolve)
  );
  if (!cfg?.history?.persist) return;

  const snap = History.snapshot();
  const next = {
    ...cfg,
    history: {
      ...cfg.history,
      stack: snap.stack,
      index: snap.index,
      max_size: cfg.history.max_size,
      enabled: cfg.history.enabled !== false,
      persist: true,
    },
  };

  EventBus.emit("config:update", { history: next.history });
}

function normalizeToTplEntry({ link, template, entry }) {
  if (link && link.startsWith("formidable://")) {
    const p = History.parseLink(link);
    if (p) return { tpl: p.template, datafile: p.datafile };
  }
  return { tpl: template || "", datafile: entry || "" };
}

/**
 * Special history-driven navigation.
 * Accepts: { link?, template?, entry?, source? }
 * Normalizes to tpl/datafile and forwards to linkHandler.
 */
export async function handleHistoryNavigate(payload = {}) {
  const { tpl, datafile } = normalizeToTplEntry(payload);
  if (!tpl || !datafile) {
    EventBus.emit("logging:warning", [
      "[History] history:navigate missing template/entry",
      payload,
    ]);
    return;
  }

  const link = payload.link || History.makeLink(tpl, datafile);

  // Forward to the canonical link navigation (UI/highlight lives there)
  await EventBus.emit("link:formidable:navigate", {
    link,
    template: tpl,
    entry: datafile,
    source: payload.source || "history",
    __navFromHistory: true,
  });
}

// ─── Exported history controls ───────────────────────────────
export function handleHistoryInit(cfg) {
  History.init(cfg);
}

export async function handleHistoryPush({ template, datafile, replace = false }) {
  if (!template || !datafile) return;
  if (History.consumeSuppressNextPush()) return;

  History.add(template, datafile, { replace });
  await persistIfEnabled();
}

export async function handleHistoryBack(_, respond) {
  History.setSuppressNextPush();
  const link = History.back();
  if (link) await handleHistoryNavigate({ link, source: "back" });
  await persistIfEnabled();
  respond?.(link);
}

export async function handleHistoryForward(_, respond) {
  History.setSuppressNextPush();
  const link = History.forward();
  if (link) await handleHistoryNavigate({ link, source: "forward" });
  await persistIfEnabled();
  respond?.(link);
}

export async function handleHistoryRestore(link) {
  History.setSuppressNextPush();
  await handleHistoryNavigate({ link, source: "restore" });
}
