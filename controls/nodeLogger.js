// controls/nodeLogger.js

let loggingEnabled = true;

function setLoggingEnabled(enabled) {
  loggingEnabled = enabled;
}

function log(...args) {
  if (loggingEnabled) {
    console.log("[LOG]", ...args);
  }
}

function warn(...args) {
  if (loggingEnabled) {
    console.warn("[WARN]", ...args);
  }
}

function error(...args) {
  if (loggingEnabled) {
    console.error("[ERROR]", ...args);
  }
}

module.exports = {
  setLoggingEnabled,
  log,
  warn,
  error,
};
