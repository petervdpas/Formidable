// modules/appMenu.js

const { Menu, shell, BrowserWindow } = require("electron");
const fileManager = require("./fileManager");
const configManager = require("./configManager");

function buildAppMenu(win) {
  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open Setup Folder",
          click: () => {
            shell.openPath(fileManager.resolvePath("setup"));
          },
        },
        {
          label: "Open Markdown Folder",
          click: () => {
            const config = configManager.loadUserConfig();
            const setupName = config.recent_setups?.[0];
            if (!setupName) return;
        
            const setupPath = fileManager.resolvePath("setup", setupName);
            if (!fileManager.fileExists(setupPath)) {
              error("[AppMenu] Template not found:", setupPath);
              return;
            }
        
            try {
              const yaml = fileManager.loadFile(setupPath, { format: "yaml" });
              const targetPath = fileManager.resolvePath(yaml.markdown_dir);
              shell.openPath(targetPath);
            } catch (err) {
              error("[AppMenu] Failed to open markdown folder:", err);
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Config",
      submenu: [
        {
          label: "Settings...",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              focused.webContents.executeJavaScript("window.openSettingsModal()");
            }
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggledevtools" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            win.webContents.executeJavaScript(`
              alert("Formidable v1.0\\nMarkdown Form Editor\\nBuilt with Electron")
            `);
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}

module.exports = { buildAppMenu };
