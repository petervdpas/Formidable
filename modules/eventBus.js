// modules/eventBus.js

import { log, warn, error } from "./logger.js";

const listeners = {};

export const EventBus = {
  on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    log(
      `[EventBus] Registered listener for "${event}". Total: ${listeners[event].length}`
    );
  },

  off(event, callback) {
    if (!listeners[event]) {
      warn(`[EventBus] Tried to remove listener for unknown event "${event}".`);
      return;
    }

    const originalCount = listeners[event].length;
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
    const newCount = listeners[event].length;

    if (originalCount === newCount) {
      warn(`[EventBus] Listener not found for "${event}".`);
    } else {
      log(`[EventBus] Removed listener for "${event}". Remaining: ${newCount}`);
    }
  },

  emit(event, payload) {
    if (!listeners[event] || listeners[event].length === 0) {
      log(`[EventBus] Emitted "${event}" but no listeners were registered.`);
      return;
    }

    log(
      `[EventBus] Emitting "${event}" to ${listeners[event].length} listener(s). Payload:`,
      payload
    );
    for (const callback of listeners[event]) {
      try {
        callback(payload);
      } catch (err) {
        error(`[EventBus] Error in listener for "${event}":`, err);
      }
    }
  },
};
