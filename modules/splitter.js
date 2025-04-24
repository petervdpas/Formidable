export function setupSplitter({ splitter, left, right, container, min = 150 }) {
  let isDragging = false;
  let startX = 0;
  let startLeftWidth = 0;

  const handle = splitter.querySelector("div");

  const updateCursor = (active) => {
    document.body.style.cursor = active ? "col-resize" : "";
  };

  handle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startLeftWidth = left.offsetWidth;
    updateCursor(true);
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const newLeftWidth = startLeftWidth + dx;
    const containerWidth = container.clientWidth;
    const maxLeftWidth = containerWidth - min;

    if (newLeftWidth >= min && newLeftWidth <= maxLeftWidth) {
      left.style.width = `${newLeftWidth}px`;
      right.style.width = `${
        containerWidth - newLeftWidth - splitter.offsetWidth
      }px`;
      left.style.flex = "none";
      right.style.flex = "none";
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      updateCursor(false);
    }
  });
}
