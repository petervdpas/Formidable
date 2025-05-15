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
      await window.api.config.updateUserConfig({
        [configKey]: cleanLast,
      });
    }
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
