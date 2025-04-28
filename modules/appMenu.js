// modules/appMenu.js

const { Menu, shell, BrowserWindow } = require("electron");
const path = require("path");
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
            shell.openPath(path.join(__dirname, "..", "setup"));
          },
        },
        {
          label: "Open Markdown Folder",
          click: () => {
            const config = configManager.loadUserConfig();
            const setupName = config.recent_setups?.[0];
            if (!setupName) return;
            const yaml = fileManager.loadSetupYaml(setupName);
            const targetPath = path.resolve(__dirname, "..", yaml.markdown_dir);
            shell.openPath(targetPath);
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
