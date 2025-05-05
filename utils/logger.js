// utils/logger.js

let loggingEnabled = true;

export function setLoggingEnabled(enabled) {
  loggingEnabled = enabled;
}

export function log(...args) {
  if (loggingEnabled) {
    console.log(...args);
  }
}

export function warn(...args) {
  if (loggingEnabled) {
    console.warn(...args);
  }
}

export function error(...args) {
  if (loggingEnabled) {
    console.error(...args);
  }
}
