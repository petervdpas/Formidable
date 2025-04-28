// markdownListManager.js

import { updateStatus } from "./statusManager.js";
import { log, warn, error } from "./logger.js"; // <-- ADD THIS LINE

export function initMarkdownListManager(selectedTemplateGetter) {
  const sidebar = document.getElementById("markdown-list");
  if (!sidebar) {
    error("[MarkdownListManager] #markdown-list not found!");
    throw new Error("Markdown sidebar container #markdown-list not found.");
  }

  async function loadMarkdownFiles() {
    log("[MarkdownList] Starting file load...");

    const selectedTemplate = await selectedTemplateGetter();
    log("[MarkdownList] Selected template:", selectedTemplate);

    if (!selectedTemplate) {
      warn("[MarkdownList] No selected template.");
      sidebar.innerHTML = "<div class='empty-message'>No template selected.</div>";
      return;
    }

    if (!selectedTemplate.markdown_dir) {
      warn("[MarkdownList] No markdown_dir field.");
      sidebar.innerHTML = "<div class='empty-message'>Template missing directory.</div>";
      return;
    }

    log("[MarkdownList] Ensuring markdown dir:", selectedTemplate.markdown_dir);
    sidebar.innerHTML = "";

    try {
      await window.api.ensureMarkdownDir(selectedTemplate.markdown_dir);

      const files = await window.api.listMarkdownFiles(selectedTemplate.markdown_dir);
      log("[MarkdownList] Files found:", files);

      if (!files || files.length === 0) {
        sidebar.innerHTML = "<div class='empty-message'>No markdown files yet.</div>";
        return;
      }

      files.forEach((file) => {
        
        log("[MarkdownList] Adding file:", file);
        const item = document.createElement("div");
        item.className = "markdown-item";
        item.textContent = file.replace(/\.md$/, "");
      
        item.addEventListener("click", async () => {
          try {
            log("[MarkdownList] Loading markdown file:", file);
        
            const selectedTemplate = await selectedTemplateGetter();
            if (!selectedTemplate) {
              warn("[MarkdownList] No template selected when clicking file.");
              return;
            }
        
            const filePath = selectedTemplate.markdown_dir;
            const fileContent = await window.api.loadMarkdownFile({ dir: filePath, filename: file });
        
            await window.markdownFormManager.loadMarkdownData(fileContent, file);
        
            updateStatus(`Loaded: ${file}`);
          } catch (err) {
            error("[MarkdownList] Failed to load markdown:", err);
            updateStatus("Error loading markdown file.");
          }
        });
      
        sidebar.appendChild(item);
      });

      updateStatus(`Loaded ${files.length} markdown file(s).`);
    } catch (err) {
      error("[MarkdownList] Load failed:", err);
      sidebar.innerHTML = "<div class='empty-message'>Error loading files.</div>";
      updateStatus("Error loading markdown files.");
    }
  }

  return { loadMarkdownFiles };
}
