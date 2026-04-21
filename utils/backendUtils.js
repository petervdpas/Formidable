// utils/backendUtils.js
// Backend-selection helpers. Formidable is local-first and then either
// Git or GiGot; this file owns the "which backend is this profile using"
// question plus the per-backend connection descriptors callers hand to
// the respective controls. Git-specific path helpers still live in
// gitUtils.js (unchanged) — this file is the neutral ground above them.

/**
 * Derive the active remote backend from a config object.
 * Falls back to "none" when unset. Legacy `use_git: true` promotes
 * to "git" so upgraders keep their setting without a migration pass.
 */
export function deriveBackend(cfg) {
  const v = cfg?.remote_backend;
  if (v === "git" || v === "gigot") return v;
  if (cfg?.use_git === true) return "git";
  return "none";
}

/**
 * Build a connection descriptor for gigotManager operations.
 * Trims whitespace on URL/repo; leaves token untouched (secret).
 * Callers pass this straight into window.api.gigot.* methods — the
 * control-side validateConn rejects empty fields.
 */
export function resolveGigotConn(cfg) {
  return {
    baseUrl: (cfg?.gigot_base_url || "").trim(),
    token: cfg?.gigot_token || "",
    repoName: (cfg?.gigot_repo_name || "").trim(),
  };
}

export const REMOTE_BACKENDS = Object.freeze(["none", "git", "gigot"]);
