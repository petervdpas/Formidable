const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

if (process.platform !== "win32") {
  console.log("[patch-icon] Skipped: not Windows.");
  process.exit(0);
}

const exePath = path.resolve("dist/win-unpacked/Formidable.exe");
const icoPath = path.resolve("assets/formidable.ico");
const rceditPath = path.resolve(
  process.env.APPDATA,
  "npm",
  "node_modules",
  "rcedit",
  "bin",
  "rcedit.exe"
);

if (!fs.existsSync(exePath)) {
  console.error("[patch-icon] EXE not found:", exePath);
  process.exit(1);
}

console.log("[patch-icon] Running:", rceditPath);
execFileSync(rceditPath, [exePath, "--set-icon", icoPath]);
console.log("[patch-icon] Icon patched successfully.");
