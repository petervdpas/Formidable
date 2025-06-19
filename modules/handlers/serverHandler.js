// modules/handlers/serverHandler.js

import { EventBus } from "../eventBus.js";

let serverState = {
  running: false,
  port: null,
};

export async function handleStartServer(forcePort = null) {
  try {
    const config = await window.api.config.loadUserConfig();
    const port = forcePort || config.internal_server_port || 8383;
    const enabled = config.enable_internal_server === true;

    if (!enabled) {
      EventBus.emit("logging:warning", [
        "[ServerHandler] Not starting server — setting disabled.",
      ]);
      return;
    }

    if (serverState.running) {
      EventBus.emit("logging:default", [
        `[ServerHandler] Already running on port ${serverState.port}`,
      ]);
      return;
    }

    await window.api.internalServer.startInternalServer(port);
    serverState = { running: true, port };

    EventBus.emit("logging:default", [
      `[ServerHandler] Started internal server on port ${port}`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ServerHandler] Failed to start internal server:",
      err,
    ]);
  }
}

export async function handleStopServer() {
  try {
    if (!serverState.running) {
      EventBus.emit("logging:warning", [
        "[ServerHandler] Server not running — nothing to stop.",
      ]);
      return;
    }

    await window.api.internalServer.stopInternalServer();
    serverState = { running: false, port: null };

    EventBus.emit("logging:default", [
      "[ServerHandler] Stopped internal server.",
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ServerHandler] Failed to stop internal server:",
      err,
    ]);
  }
}

export async function handleGetServerStatus({ callback }) {
  try {
    const status = await window.api.internalServer.getInternalServerStatus();
    serverState = {
      running: !!status?.running,
      port: status?.port || null,
    };

    callback?.(serverState);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ServerHandler] Failed to get internal server status:",
      err,
    ]);
    callback?.(null);
  }
}