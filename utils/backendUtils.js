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
 * Author block sources from the profile's author_name / author_email
 * so commits land in GiGot under the real team member, not the
 * subscription-key identity. Callers pass this straight into
 * window.api.gigot.* methods — the control-side validateConn rejects
 * empty fields for baseUrl/token/repo; author is optional (GiGot
 * stamps the subscription-key username when absent).
 */
export function resolveGigotConn(cfg) {
  return {
    baseUrl: (cfg?.gigot_base_url || "").trim(),
    token: cfg?.gigot_token || "",
    repoName: (cfg?.gigot_repo_name || "").trim(),
    author: {
      name: (cfg?.author_name || "").trim(),
      email: (cfg?.author_email || "").trim(),
    },
  };
}

export const REMOTE_BACKENDS = Object.freeze(["none", "git", "gigot"]);
