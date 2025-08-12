// controls/windowBounds.js

const { screen } = require("electron");

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getSafeBounds(bounds = {}) {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const minW = 600;
  const minH = 400;

  // Start with sane minimums/defaults
  let width = Math.max(minW, bounds.width || 1024);
  let height = Math.max(minH, bounds.height || 800);

  // Determine target display: one containing saved (x,y), else primary
  const hasXY = typeof bounds.x === "number" && typeof bounds.y === "number";
  const targetDisplay = hasXY
    ? displays.find((d) => {
        const b = d.workArea; // use workArea to avoid taskbars/docks
        return (
          bounds.x >= b.x &&
          bounds.y >= b.y &&
          bounds.x < b.x + b.width &&
          bounds.y < b.y + b.height
        );
      }) || primaryDisplay
    : primaryDisplay;

  const area = targetDisplay.workArea;

  // If saved size is larger than the work area, clamp it
  width = clamp(width, minW, area.width);
  height = clamp(height, minH, area.height);

  // If we have x/y, clamp them so the window remains fully visible
  let x, y;
  if (hasXY) {
    x = clamp(bounds.x, area.x, area.x + area.width - width);
    y = clamp(bounds.y, area.y, area.y + area.height - height);
  } else {
    // Center on the target display
    x = area.x + Math.floor((area.width - width) / 2);
    y = area.y + Math.floor((area.height - height) / 2);
  }

  return { x, y, width, height };
}

module.exports = { getSafeBounds };
