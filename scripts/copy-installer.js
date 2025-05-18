// scripts/copy-installer.js

const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const installerDir = path.join(__dirname, "..", "installer");

// Find the installer EXE
const installer = fs.readdirSync(distDir).find((file) =>
  file.endsWith(".exe") && file.startsWith("Formidable Setup")
);

if (!installer) {
  console.error("❌ No installer EXE found in /dist.");
  process.exit(1);
}

if (!fs.existsSync(installerDir)) {
  fs.mkdirSync(installerDir);
}

const src = path.join(distDir, installer);
const dest = path.join(installerDir, installer);

fs.copyFileSync(src, dest);
console.log(`✅ Copied installer to: ${dest}`);
