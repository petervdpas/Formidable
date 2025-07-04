// utils/configUtils.js

/**
 * Retrieve the full current user config via EventBus.
 */
export async function getUserConfig() {
  return new Promise((resolve) => {
    EventBus.emit("config:load", (config) => {
      resolve(config || {});
    });
  });
}

/**
 * Save/update part of the user config.
 * @param {Object} partial - Partial config to apply.
 */
export async function saveUserConfig(partial) {
  EventBus.emit("config:update", partial);
}
