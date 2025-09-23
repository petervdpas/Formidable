// modules/handlers/tasksHandler.js

import { EventBus } from "../eventBus.js";
import { Scheduler } from "../../utils/taskScheduler.js";

// Wrap scheduler ops and log centrally
export function handleTasksRegister(spec) {
  const ok = Scheduler.register(spec);
  EventBus.emit(ok ? "logging:default" : "logging:error", [
    ok
      ? `[Tasks] Registered "${spec?.id}"`
      : `[Tasks] Failed register for "${spec?.id}"`,
  ]);
}

export function handleTasksUnregister(id) {
  const ok = Scheduler.unregister(id);
  EventBus.emit(ok ? "logging:default" : "logging:warning", [
    ok ? `[Tasks] Unregistered "${id}"` : `[Tasks] Not found "${id}"`,
  ]);
}

export function handleTasksUpdate({ id, patch }) {
  const ok = Scheduler.update(id, patch || {});
  EventBus.emit(ok ? "logging:default" : "logging:warning", [
    ok ? `[Tasks] Updated "${id}"` : `[Tasks] Update failed "${id}"`,
  ]);
}

export function handleTasksPause(id) {
  const ok = Scheduler.pause(id);
  EventBus.emit(ok ? "logging:default" : "logging:warning", [
    ok ? `[Tasks] Paused "${id}"` : `[Tasks] Pause failed "${id}"`,
  ]);
}

export function handleTasksResume(id) {
  const ok = Scheduler.resume(id);
  EventBus.emit(ok ? "logging:default" : "logging:warning", [
    ok ? `[Tasks] Resumed "${id}"` : `[Tasks] Resume failed "${id}"`,
  ]);
}

export function handleTasksRunNow(payload) {
  // payload can be string id or { id, args }
  const id = typeof payload === "string" ? payload : payload?.id;
  const args = typeof payload === "object" ? payload?.args : undefined;
  const ok = Scheduler.runNow(id, args);
  EventBus.emit(ok ? "logging:default" : "logging:warning", [
    ok ? `[Tasks] RunNow "${id}"` : `[Tasks] RunNow failed "${id}"`,
  ]);
}

export function handleTasksList(cb) {
  cb?.(Scheduler.list());
}

export function handleTasksExists(id, cb) {
  cb?.(Scheduler.exists(id));
}

export function handleTasksClearAll() {
  Scheduler.clearAll();
  EventBus.emit("logging:default", ["[Tasks] Cleared all tasks"]);
}
