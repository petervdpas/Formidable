// modules/ipcRoutes.js

const { ipcMain } = require("electron");
const { log, error } = require("./nodeLogger");

// Helper to register IPC handlers cleanly
function registerIpc(name, handler) {
  ipcMain.handle(name, async (...args) => {
    try {
      log(`[IPC] ${name} triggered`);
      return await handler(...args);
    } catch (err) {
      error(`[IPC] ${name} failed:`, err);
      return null; // Important: prevent unhandled promise rejection
    }
  });
}

module.exports = { registerIpc };
