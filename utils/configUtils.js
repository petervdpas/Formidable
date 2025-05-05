// utils/configUtils.js

export async function selectLastOrFallback({
  options,
  lastSelected,
  onSelect,
  onFallback,
  configKey,
}) {
  if (lastSelected && options.includes(lastSelected)) {
    await onSelect(lastSelected);
  } else if (options.length > 0) {
    const fallback = options[0];
    await onSelect(fallback);
    if (configKey) {
      await window.api.config.updateUserConfig({
        [configKey]: fallback,
      });
    }
    if (onFallback) onFallback(fallback);
  }
}
