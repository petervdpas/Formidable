// controls/nodeLogger.js

const fs = require("fs");
const path = require("path");

let loggingEnabled = true;
let loggingWrite = true;

// Determine log file location based on mode
const isPackaged = !!process.mainModule?.filename.includes("app.asar"); // crude but works
const logDir = isPackaged ? path.dirname(process.execPath) : process.cwd();
const logFile = path.join(logDir, "formidable.log");

// Clear log file on startup
try {
  fs.writeFileSync(logFile, "");
  console.log("[LOGGER] Log file cleared:", logFile);
} catch (err) {
  console.error("[LOGGER] Failed to clear log file:", err.message);
}

function setLoggingEnabled(enabled) {
  loggingEnabled = enabled;
}

function setWriteEnabled(enabled) {
  loggingWrite = enabled;
}

function writeToLogFile(level, ...args) {
  if (!loggingWrite) return;

  try {
    const msg = `[${level}] ${args.join(" ")}\n`;
    fs.appendFileSync(logFile, msg);
  } catch (err) {
    console.error("[Logger] Failed to write to log file:", err);
  }
}

function log(...args) {
  if (loggingEnabled) {
    console.log("[LOG]", ...args);
    writeToLogFile("LOG", ...args);
  }
}

function warn(...args) {
  if (loggingEnabled) {
    console.warn("[WARN]", ...args);
    writeToLogFile("WARN", ...args);
  }
}

function error(...args) {
  if (loggingEnabled) {
    console.error("[ERROR]", ...args);
    writeToLogFile("ERROR", ...args);
  }
}

module.exports = {
  setLoggingEnabled,
  setWriteEnabled,
  log,
  warn,
  error,
};
