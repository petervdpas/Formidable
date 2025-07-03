// utils/configUtils.js

export async function selectLastOrFallback({
  options,
  lastSelected,
  onSelect,
  onFallback,
  configKey,
}) {
  // Strip eventueel padinfo van bv. "templates/basic.yaml" → "basic.yaml"
  const cleanLast = lastSelected?.split(/[/\\]/).pop();

  if (cleanLast && options.includes(cleanLast)) {
    await onSelect(cleanLast);
    if (configKey && cleanLast !== lastSelected) {
      EventBus.emit("config:update", { [configKey]: cleanLast });
    }
  } else if (options.length > 0) {
    const fallback = options[0];
    await onSelect(fallback);
    if (configKey) {
      EventBus.emit("config:update", { [configKey]: fallback });
    }
    if (onFallback) onFallback(fallback);
  }
}

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
