// markdownListManager.js

import { updateStatus } from "./statusManager.js";

export function initMarkdownListManager(selectedTemplateGetter) {
  const sidebar = document.getElementById("markdown-list");
  if (!sidebar) {
    console.error("Markdown list container not found: #markdown-list");
    return;
  }

  async function loadMarkdownFiles() {
    const selectedTemplate = await selectedTemplateGetter();
    if (!selectedTemplate || !selectedTemplate.markdown_dir) {
      console.warn("No selected template to load markdown files from.");
      return;
    }

    sidebar.innerHTML = ""; // Clear previous

    try {
      await window.api.ensureMarkdownDir(selectedTemplate.markdown_dir);
      const dirPath = selectedTemplate.markdown_dir;
      const files = await window.api.listMarkdownFiles(dirPath);

      if (files.length === 0) {
        sidebar.innerHTML =
          "<div class='empty-message'>No markdown files yet.</div>";
        return;
      }

      files.forEach((file) => {
        const item = document.createElement("div");
        item.className = "markdown-item";
        item.textContent = file.replace(/\.md$/, "");
        sidebar.appendChild(item);
      });

      updateStatus(`Loaded ${files.length} markdown file(s).`);
    } catch (err) {
      console.error("Failed to load markdown files:", err);
      updateStatus("Error loading markdown files.");
    }
  }

  return { loadMarkdownFiles };
}
