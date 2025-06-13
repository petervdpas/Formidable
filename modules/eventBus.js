// modules/eventBus.js

const listeners = {};
const debug = true;

export const EventBus = {
  on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }

    // Avoid duplicate registration
    if (listeners[event].includes(callback)) {
      if (debug) {
        console.log(`[EventBus] Skipped duplicate listener for "${event}".`);
      }
      return;
    }

    listeners[event].push(callback);

    if (debug) {
      console.log(
        `[EventBus] Registered listener for "${event}". Total: ${listeners[event].length}`
      );
    }
  },

  off(event, callback) {
    if (!listeners[event]) return;

    const original = listeners[event];
    listeners[event] = original.filter((cb) => cb !== callback);

    if (debug && original.length !== listeners[event].length) {
      console.log(
        `[EventBus] Removed listener for "${event}". Remaining: ${listeners[event].length}`
      );
    }
  },

  async emit(event, payload) {
    const cbs = listeners[event];
    if (!cbs || cbs.length === 0) {
      if (debug) {
        console.log(
          `[EventBus] Emitted "${event}" but no listeners were registered.`
        );
      }
      return;
    }

    const promises = cbs.map(async (cb) => {
      try {
        return await cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    });

    await Promise.all(promises);
  },

  async emitWithResponse(event, payload) {
    const cbs = listeners[event];
    if (!cbs || cbs.length === 0) {
      if (debug) {
        console.log(
          `[EventBus] emitWithResponse("${event}") had no listeners.`
        );
      }
      return null;
    }

    const handler = cbs[0];

    // Dual mode: supports async-return and callback-style
    if (handler.length >= 2) {
      // expects: (payload, callback)
      return new Promise((resolve) => {
        try {
          handler(payload, resolve);
        } catch (err) {
          console.error(`[EventBus] emitWithResponse callback error:`, err);
          resolve(null);
        }
      });
    } else {
      // expects: async function(payload)
      try {
        return await handler(payload);
      } catch (err) {
        console.error(`[EventBus] emitWithResponse async error:`, err);
        return null;
      }
    }
  },

  once(event, callback) {
    const onceWrapper = (payload) => {
      this.off(event, onceWrapper);
      callback(payload);
    };
    this.on(event, onceWrapper);
  },
};
