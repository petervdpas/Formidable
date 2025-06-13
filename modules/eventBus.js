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

  emitWithResponse(event, payload) {
    const cbs = listeners[event];
    if (!cbs || cbs.length === 0) {
      if (debug) {
        console.log(
          `[EventBus] emitWithResponse("${event}") had no listeners.`
        );
      }
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      // Call only the first listener and give it a callback to resolve the promise
      try {
        cbs[0](payload, resolve);
      } catch (err) {
        console.error(
          `[EventBus] Error in emitWithResponse for "${event}":`,
          err
        );
        resolve(null);
      }
    });
  },

  once(event, callback) {
    const onceWrapper = (payload) => {
      this.off(event, onceWrapper);
      callback(payload);
    };
    this.on(event, onceWrapper);
  },
};
