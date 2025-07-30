import { EventBus } from "../modules/eventBus.js";

let cachedConfig = null;

const defaultAllowedConfigKeys = [
  "theme",
  "show_icon_buttons",
  "use_expressions",
  "font_size",
  "development_enable",
  "logging_enabled",
  "enable_plugins",
  "context_mode",
  "context_folder",
  "selected_template",
  "selected_data_file",
  "author_name",
  "author_email",
  "encryption_key",
  "use_git",
  "git_root",
  "enable_internal_server",
  "internal_server_port",
  "window_bounds",
];

// Get full config or one key (optionally scoped to allowedKeys)
export async function getUserConfig(key, options = {}) {
  const allowedKeys = options.allowedKeys ?? defaultAllowedConfigKeys;

  if (!cachedConfig) {
    cachedConfig = await new Promise((resolve) => {
      EventBus.emit("config:load", (config) => resolve(config || {}));
    });
  }

  if (typeof key === "string") {
    if (!allowedKeys.includes(key)) {
      console.warn(`[getUserConfig] Disallowed key: "${key}"`);
      return undefined;
    }
    return cachedConfig[key];
  }

  return cachedConfig;
}

// Clear the local cache (e.g., after settings update)
export function invalidateUserConfig() {
  cachedConfig = null;
}

// Save and optionally invalidate cache
export async function saveUserConfig(partial, options = { invalidate: true }) {
  EventBus.emit("config:update", partial);
  if (options.invalidate) {
    invalidateUserConfig();
  }
}