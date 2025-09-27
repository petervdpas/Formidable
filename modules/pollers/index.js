// modules/pollers/index.js

//import { startDemoThemePulsePoller } from "./demoThemePulsePoller.js";
import { startGitQuickStatusPoller } from "./gitQuickStatusPoller.js";

export async function startPollers() {
  // Demo theme pulse — start unconditionally for testing
  //startDemoThemePulsePoller();

  // Git button color/status poller
  await startGitQuickStatusPoller("status-gitquick-btn");
}
