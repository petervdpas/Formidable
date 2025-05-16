// controls/nodeLogger.js

const fs = require("fs");
const path = require("path");

let loggingEnabled = true;
let loggingWrite = true;

const pathToExe = process.execPath;
const exeDir = path.dirname(pathToExe);
const logFile = path.join(exeDir, "formidable.log");

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
