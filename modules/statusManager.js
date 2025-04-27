let statusBar = null;

export function initStatusManager(statusBarId) {
  statusBar = document.getElementById(statusBarId);
}

export function updateStatus(message) {
  if (statusBar) {
    statusBar.textContent = message;
  } else {
    console.warn("StatusManager: No status bar initialized.");
  }
}
