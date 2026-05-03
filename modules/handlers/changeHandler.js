// modules/handlers/changeHandler.js

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";

let lastCount = 0;

function announce(count) {
  if (count === lastCount) return;
  lastCount = count;
  EventBus.emit("changes:changed", [{ count }]);
}

export async function handleChangesBump({ callback } = {}) {
  try {
    const cfg = await reloadUserConfig();
    const backend = cfg?.remote_backend;
    let res;
    if (backend === "git" || backend === "gigot") {
      res = await window.api.changes.changesBump();
    } else {
      res = await window.api.changes.changesReset();
    }
    if (res?.ok) announce(res.data?.count || 0);
    callback?.(res);
  } catch (err) {
    callback?.({ ok: false, error: String(err?.message || err) });
  }
}

export async function handleChangesGet({ callback } = {}) {
  try {
    const res = await window.api.changes.changesGet();
    if (res?.ok) announce(res.data?.count || 0);
    callback?.(res);
  } catch (err) {
    callback?.({ ok: false, error: String(err?.message || err) });
  }
}

export async function handleChangesReset({ callback } = {}) {
  try {
    const res = await window.api.changes.changesReset();
    if (res?.ok) announce(0);
    callback?.(res);
  } catch (err) {
    callback?.({ ok: false, error: String(err?.message || err) });
  }
}

export function getChanges() {
  return lastCount;
}
