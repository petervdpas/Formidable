// modules/pollers/index.js

//import { startDemoThemePulsePoller } from "./demoThemePulsePoller.js";
import { startPendingChangesPoller } from "./pendingChangesPoller.js";

export async function startPollers() {
  // Demo theme pulse — start unconditionally for testing
  //startDemoThemePulsePoller();

  // The pending-changes poller orchestrates the rest: it picks the
  // backend-specific sibling (git/gigot quick-status poller) based
  // on cfg.remote_backend, so only one backend probe runs at a time.
  await startPendingChangesPoller();
}
