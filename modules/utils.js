// modules/utils.js

import { log, warn } from "./logger.js";

export function highlightAndClickMatch(
  container,
  targetName,
  onClickFallback = null
) {
  if (!container || !targetName) {
    warn("[highlightAndClickMatch] Missing container or targetName");
    return;
  }

  const normalizedTarget = targetName
    .replace(/\.yaml$|\.md$/i, "")
    .toLowerCase();

  log(`[highlightAndClickMatch] Searching for: ${normalizedTarget}`);

  const match = Array.from(container.children).find((el) => {
    const text = el.textContent.trim().toLowerCase();
    log(`[highlightAndClickMatch] Comparing to: ${text}`);
    return text === normalizedTarget;
  });

  if (match) {
    if (!match.classList.contains("selected")) {
      log(`[highlightAndClickMatch] Match found: "${match.textContent.trim()}", clicking...`);
      match.click();

      if (typeof onClickFallback === "function") {
        setTimeout(() => {
          const stillUnselected = !match.classList.contains("selected");
          if (stillUnselected) {
            warn("[highlightAndClickMatch] Native click didn't work, using fallback");
            onClickFallback(targetName);
          } else {
            log("[highlightAndClickMatch] Click worked, item is now selected.");
          }
        }, 50);
      }
    } else {
      log("[highlightAndClickMatch] Item already selected, skipping click.");
    }
  } else {
    warn(`[highlightAndClickMatch] No match found for: ${normalizedTarget}`);
  }
}
