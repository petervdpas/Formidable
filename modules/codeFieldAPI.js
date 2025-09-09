// modules/codeFieldAPI.js

import { EventBus } from "./eventBus.js";

export function exposeCodeFieldAPI() {
  if (!window.FGA) {
    console.warn("[CodeFieldAPI] FGA not yet exposed, CFA will be empty.");
    window.CFA = {};
    return;
  }

  const getSnap = () => EventBus.emitWithResponse("form:context:get");

  const api = {
    path: window.FGA.path,
    string: window.FGA.string,
    transform: window.FGA.transform,
    form: {
      snapshot: async () => await getSnap(),
    },
  };

  window.CFA = api;
  console.log("[CodeFieldAPI] CFA exposed:", Object.keys(api));
}
