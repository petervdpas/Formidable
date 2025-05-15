// controls/windowBounds.js

const { screen } = require("electron");

function getSafeBounds(bounds = {}) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay().bounds;

  let width = Math.max(600, bounds.width || 1024);
  let height = Math.max(400, bounds.height || 800);

  let x = typeof bounds.x === "number" ? bounds.x : undefined;
  let y = typeof bounds.y === "number" ? bounds.y : undefined;

  if (typeof x === "number" && typeof y === "number") {
    const fitsOnScreen = displays.some((d) => {
      return (
        x >= d.bounds.x &&
        y >= d.bounds.y &&
        x < d.bounds.x + d.bounds.width &&
        y < d.bounds.y + d.bounds.height
      );
    });

    if (!fitsOnScreen) {
      x = undefined;
      y = undefined;
    }
  }

  return {
    width,
    height,
    ...(x != null && y != null ? { x, y } : {}),
  };
}

module.exports = { getSafeBounds };
