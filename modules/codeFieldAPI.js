// modules/codeFieldAPI.js
export function exposeCodeFieldAPI() {
  if (!window.FGA) {
    console.warn("[CodeFieldAPI] FGA not yet exposed, CFA will be empty.");
    window.CFA = {};
    return;
  }

  const api = {
    path: window.FGA.path,
    string: window.FGA.string,
    transform: window.FGA.transform,
  };

  window.CFA = api;
  console.log("[CodeFieldAPI] CFA exposed:", Object.keys(api));
}