// utils/iconButtonToggle.js

export async function createToggleButtons(handlers, variantMap) {
  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  const useIcon = config.show_icon_buttons;
  const result = {};

  for (const key in handlers) {
    const ButtonFn = useIcon ? variantMap.icon?.[key] : variantMap.label?.[key];

    if (typeof ButtonFn === "function") {
      result[key] = ButtonFn(handlers[key]);
    } else {
      console.warn(
        `[createToggleButtons] Missing button factory for "${key}" in variantMap.`
      );
    }
  }

  return result;
}
