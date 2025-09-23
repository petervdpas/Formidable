// utils/taskScheduler.js
// Tiny scheduler: register() / unregister() / update() / pause()/resume() / runNow() / list()

/**
 * Task function signature:
 *   fn(args, ctx) -> void|Promise<void>
 * Where ctx = { id, runs, lastStarted, lastFinished, update(patch), get() }
 *
 * Condition forms:
 *   - function(): boolean
 *   - { type:'dom-exists', selector:string, root?:HTMLElement }
 *   - { type:'and'|'or', of:Condition[] }
 *   - { type:'not', of:Condition }
 */

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function resolveCondition(cond) {
  if (!cond) return true;
  if (typeof cond === "function") return !!cond();
  switch (cond.type) {
    case "dom-exists": {
      const root = cond.root || document;
      return !!root?.querySelector?.(cond.selector);
    }
    case "and":
      return (cond.of || []).every(resolveCondition);
    case "or":
      return (cond.of || []).some(resolveCondition);
    case "not":
      return !resolveCondition(cond.of);
    default:
      return false;
  }
}

export class TaskScheduler {
  constructor() {
    /** @type {Map<string, any>} */
    this.tasks = new Map();
    this._visHandler = this._visHandler.bind(this);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._visHandler);
    }
  }

  register(spec) {
    const {
      id,
      fn,
      interval = 10_000,
      immediate = false,
      args = undefined,
      condition = undefined,
      maxRuns = Infinity,
      pauseWhenHidden = true,
      intervalHidden = undefined,
      jitterPct = 0,
      backoff = { strategy: "none", factor: 2, max: 60_000 },
    } = spec || {};

    if (!id || typeof fn !== "function") return false;

    this.unregister(id);

    const state = {
      id,
      fn,
      args,
      condition,
      runs: 0,
      maxRuns,
      paused: false,
      baseInterval: Math.max(25, interval),
      intervalHidden: intervalHidden ? Math.max(25, intervalHidden) : undefined,
      pauseWhenHidden: !!pauseWhenHidden,
      jitterPct: clamp(jitterPct, 0, 1),
      backoff,
      backoffMs: Math.max(25, interval),
      _failed: false,
      running: false,
      lastStarted: null,
      lastFinished: null,
      timer: null,
    };

    this.tasks.set(id, state);

    if (immediate) this._invoke(state, true);
    this._arm(state);
    return true;
  }

  unregister(id) {
    const t = this.tasks.get(id);
    if (!t) return false;
    clearTimeout(t.timer);
    this.tasks.delete(id);
    return true;
  }

  clearAll() {
    for (const id of Array.from(this.tasks.keys())) this.unregister(id);
  }

  pause(id) {
    const t = this.tasks.get(id);
    if (!t || t.paused) return false;
    t.paused = true;
    clearTimeout(t.timer);
    t.timer = null;
    return true;
  }

  resume(id) {
    const t = this.tasks.get(id);
    if (!t || !t.paused) return false;
    t.paused = false;
    this._arm(t);
    return true;
  }

  exists(id) {
    return this.tasks.has(id);
  }

  update(id, patch = {}) {
    const t = this.tasks.get(id);
    if (!t) return false;
    clearTimeout(t.timer);

    if (patch.interval != null) t.baseInterval = Math.max(25, patch.interval);
    if (patch.intervalHidden != null)
      t.intervalHidden = Math.max(25, patch.intervalHidden);
    if (patch.pauseWhenHidden != null)
      t.pauseWhenHidden = !!patch.pauseWhenHidden;
    if (patch.jitterPct != null) t.jitterPct = clamp(patch.jitterPct, 0, 1);
    if (patch.condition !== undefined) t.condition = patch.condition;
    if (patch.maxRuns != null) t.maxRuns = patch.maxRuns;
    if (patch.args !== undefined) t.args = patch.args;
    if (patch.backoff) t.backoff = { ...t.backoff, ...patch.backoff };

    this._arm(t);
    return true;
  }

  runNow(id, overrideArgs) {
    const t = this.tasks.get(id);
    if (!t) return false;
    if (overrideArgs !== undefined) t.args = overrideArgs;
    this._invoke(t, false);
    return true;
  }

  list() {
    return Array.from(this.tasks.values()).map((t) => ({
      id: t.id,
      paused: t.paused,
      runs: t.runs,
      baseInterval: t.baseInterval,
      intervalHidden: t.intervalHidden,
      jitterPct: t.jitterPct,
      hasCondition: !!t.condition,
      lastStarted: t.lastStarted,
      lastFinished: t.lastFinished,
    }));
  }

  _visHandler() {
    // re-arm to adopt hidden/visible behavior
    this.tasks.forEach((t) => {
      clearTimeout(t.timer);
      this._arm(t);
    });
  }

  _currentInterval(t) {
    const hidden = typeof document !== "undefined" && document.hidden;
    let iv = t.baseInterval;

    if (hidden) {
      if (t.intervalHidden) iv = t.intervalHidden;
      else if (t.pauseWhenHidden) return null;
    }

    if (t.backoff?.strategy === "exponential" && t._failed) {
      iv = clamp(t.backoffMs, t.baseInterval, t.backoff?.max ?? 60_000);
    }

    if (t.jitterPct > 0) {
      const d = iv * t.jitterPct;
      const min = Math.max(25, iv - d);
      const max = iv + d;
      iv = Math.floor(min + Math.random() * (max - min));
    }
    return iv;
  }

  _arm(t) {
    if (t.paused || !this.tasks.has(t.id)) return;
    const iv = this._currentInterval(t);
    if (iv == null) return; // paused by visibility policy
    t.timer = setTimeout(() => this._invoke(t, true), iv);
  }

  async _invoke(t, respectCondition) {
    if (!this.tasks.has(t.id) || t.running) {
      this._arm(t);
      return;
    }
    if (respectCondition && !resolveCondition(t.condition)) {
      this._arm(t);
      return;
    }

    t.running = true;
    t.lastStarted = Date.now();
    try {
      const ctx = {
        id: t.id,
        runs: t.runs,
        lastStarted: t.lastStarted,
        lastFinished: t.lastFinished,
        update: (patch) => this.update(t.id, patch),
        get: () => ({ ...t, timer: undefined, running: undefined }),
      };
      await t.fn(t.args, ctx);
      t._failed = false;
      t.backoffMs = t.baseInterval;
      t.runs++;
      if (t.runs >= t.maxRuns) {
        this.unregister(t.id);
        return;
      }
    } catch (e) {
      t._failed = true;
      if (t.backoff?.strategy === "exponential") {
        const factor = t.backoff?.factor ?? 2;
        const cap = t.backoff?.max ?? 60_000;
        t.backoffMs = clamp(
          (t.backoffMs || t.baseInterval) * factor,
          t.baseInterval,
          cap
        );
      }
      // no logging here—handler layer decides how to log
    } finally {
      t.running = false;
      t.lastFinished = Date.now();
      this._arm(t);
    }
  }
}

export const Scheduler = new TaskScheduler();
