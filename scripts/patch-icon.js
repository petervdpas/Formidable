// scripts/patch-icon.js

const rcedit = require('rcedit');
const path = require('path');
const fs = require('fs');

if (process.platform !== 'win32') {
  console.log('[patch-icon] Skipped: not Windows.');
  process.exit(0);
}

const exePath = path.resolve(__dirname, '../dist/win-unpacked/Formidable.exe');
const icoPath = path.resolve(__dirname, '../assets/formidable.ico');

if (!fs.existsSync(exePath)) {
  console.error('[patch-icon] EXE not found:', exePath);
  process.exit(1);
}

console.log('[patch-icon] Patching:', exePath);
rcedit(exePath, { icon: icoPath }, (err) => {
  if (err) {
    console.error('[patch-icon] Failed:', err);
    process.exit(1);
  } else {
    console.log('[patch-icon] Icon patched successfully.');
  }
});
