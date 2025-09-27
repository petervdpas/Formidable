// controls/gitManager.js
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const simpleGit = require("simple-git");
const fileManager = require("./fileManager");
const { log, warn, error } = require("./nodeLogger");

const gitConfigCache = new Set();

// naive in-process queue to serialize git ops per repo
const repoLocks = new Map();
async function withRepoLock(repoRoot, fn) {
  const q = repoLocks.get(repoRoot) || Promise.resolve();
  let resolveNext;
  const next = new Promise((r) => (resolveNext = r));
  repoLocks.set(
    repoRoot,
    q.then(() => next)
  );
  try {
    return await fn();
  } finally {
    resolveNext();
    if (repoLocks.get(repoRoot) === next) repoLocks.delete(repoRoot);
  }
}

function ok(data) {
  return { ok: true, data };
}
function fail(err) {
  const msg = typeof err === "string" ? err : err?.message || "Unknown error";
  return { ok: false, error: msg };
}

async function getGitInstance(folderPath) {
  const absPath = fileManager.resolvePath(folderPath);
  const git = simpleGit(absPath);

  if (!gitConfigCache.has(absPath)) {
    try {
      // sensible defaults; tweak if you want rebase pulls
      await git.addConfig("credential.helper", "manager-core");
      await git.addConfig("credential.useHttpPath", "true");
      await git.addConfig("pull.rebase", "false");
      gitConfigCache.add(absPath);
    } catch (err) {
      warn(`[GitManager] Failed to inject config for ${absPath}:`, err);
    }
  }
  return git;
}

async function resolveRoot(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const root = (await git.revparse(["--show-toplevel"])).trim();
    return root;
  } catch {
    return null;
  }
}

async function isGitRepo(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    return ok(await git.checkIsRepo("root"));
  } catch (err) {
    warn("[GitManager] Git check failed:", err);
    return fail(err);
  }
}

async function getGitRoot(folderPath) {
  try {
    const root = await resolveRoot(folderPath);
    return ok(root);
  } catch (err) {
    return fail(err);
  }
}

async function status(folderPath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return ok(null);
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      const s = await git.status();
      return ok({
        created: s.created,
        deleted: s.deleted,
        modified: s.modified,
        not_added: s.not_added,
        staged: s.staged,
        conflicted: s.conflicted,
        renamed: s.renamed,
        tracking: s.tracking,
        current: s.current,
        ahead: s.ahead,
        behind: s.behind,
        files: s.files.map((f) => ({
          path: f.path,
          index: f.index,
          working_dir: f.working_dir,
        })),
        clean: s.isClean?.(),
      });
    });
  } catch (err) {
    error("[GitManager] status failed:", err);
    return fail(err);
  }
}

async function remoteInfo(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const remotes = await git.getRemotes(true);
    const branches = await git.branch(["-r"]);
    return ok({ remotes, remoteBranches: branches.all });
  } catch (err) {
    error("[GitManager] remoteInfo failed:", err);
    return fail(err);
  }
}

async function fetch(folderPath, remote = undefined, opts = []) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return ok(null);
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      const res = remote
        ? await git.fetch(remote, undefined, opts)
        : await git.fetch();
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function pull(
  folderPath,
  remote = undefined,
  branch = undefined,
  opts = []
) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return ok(null);
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      const res = await git.pull(remote, branch, opts);
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function push(
  folderPath,
  remote = undefined,
  branch = undefined,
  opts = []
) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return ok(null);
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      const res = await git.push(remote, branch, opts);
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function setUpstream(folderPath, remote, branch) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      // Equivalent to: git push -u remote branch
      const res = await git.push(["-u", remote, branch]);
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function addAll(folderPath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.add(".");
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function addPaths(folderPath, paths = []) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      if (!Array.isArray(paths) || paths.length === 0) return ok(true);
      await git.add(paths);
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function resetPaths(folderPath, paths = []) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      if (!Array.isArray(paths) || paths.length === 0) return ok(true);
      await git.reset(["HEAD", "--", ...paths]);
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function commit(folderPath, message, { addAllBeforeCommit = true } = {}) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      if (addAllBeforeCommit) await git.add("."); // <- auto-stage like before
      const res = await git.commit(message);
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function commitPaths(folderPath, message, paths = []) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      if (paths?.length) await git.add(paths);
      const res = await git.commit(message, paths || []);
      return ok(res);
    });
  } catch (err) {
    return fail(err);
  }
}

async function branches(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const b = await git.branch();
    return ok(b);
  } catch (err) {
    return fail(err);
  }
}

async function createBranch(folderPath, name, { checkout = true } = {}) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.branch([name]);
      if (checkout) await git.checkout(name);
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function checkout(folderPath, refName) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.checkout(refName);
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function deleteBranch(folderPath, name, { force = false } = {}) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.deleteLocalBranch(name, force);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

async function diffNameOnly(folderPath, base = "HEAD") {
  try {
    const git = await getGitInstance(folderPath);
    const out = await git.diff(["--name-status", base]);
    return ok(out);
  } catch (err) {
    return fail(err);
  }
}

async function diffFile(folderPath, filePath, base = "HEAD") {
  try {
    const git = await getGitInstance(folderPath);
    const out = await git.diff([base, "--", filePath]);
    return ok(out);
  } catch (err) {
    return fail(err);
  }
}

async function logCommits(folderPath, { maxCount = 50, from, to } = {}) {
  try {
    const git = await getGitInstance(folderPath);
    const opts = { maxCount };
    if (from && to) Object.assign(opts, { from, to });
    const res = await git.log(opts);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

async function resetHard(folderPath, ref = "HEAD") {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.reset(["--hard", ref]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

async function revertCommit(folderPath, hash, opts = []) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["revert", hash, ...opts]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

// ── Merge / Rebase ─────────────────────────────────────────

async function merge(folderPath, ref) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      const res = await git.merge([ref]);
      // simple-git throws on conflicts; if we reach here, likely clean merge
      return ok(res);
    });
  } catch (err) {
    // When conflicts occur, simple-git surfaces error text. We still return ok:false with message
    return fail(err);
  }
}

async function rebaseStart(folderPath, upstream) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["rebase", upstream]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function rebaseContinue(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["rebase", "--continue"]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function rebaseAbort(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["rebase", "--abort"]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function mergeAbort(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["merge", "--abort"]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function mergeContinue(folderPath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    const git = await getGitInstance(root);
    const res = await git.raw(["merge", "--continue"]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

// ── Stash ──────────────────────────────────────────────────
async function stashSave(folderPath, message = "") {
  try {
    const git = await getGitInstance(folderPath);
    const args = ["stash", "push"];
    if (message) args.push("-m", message);
    const res = await git.raw(args);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function stashList(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["stash", "list"]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}
async function stashPop(folderPath, ref = "stash@{0}") {
  try {
    const git = await getGitInstance(folderPath);
    const res = await git.raw(["stash", "pop", ref]);
    return ok(res);
  } catch (err) {
    return fail(err);
  }
}

// ── Discard / Checkout file ────────────────────────────────
async function discardFile(folderPath, filePath) {
  try {
    const absRepoPath = fileManager.resolvePath(folderPath);
    const absFilePath = fileManager.resolvePath(filePath);
    const git = await getGitInstance(absRepoPath);

    const root = (await git.revparse(["--show-toplevel"])).trim();
    const rel = fileManager.toPosixPath(
      fileManager.makeRelative(root, absFilePath)
    );

    const s = await git.status();
    const isUntracked = s.not_added.includes(rel);

    if (isUntracked) {
      log(`[GitManager] Deleting untracked file: ${rel}`);
      const full = fileManager.resolvePath(root, rel);
      const deleted = fileManager.deleteFile(full, { silent: true });
      if (!deleted) throw new Error(`Failed to delete untracked file: ${rel}`);
    } else {
      log(`[GitManager] Discarding changes for: ${rel}`);
      await git.checkout(["--", rel]);
    }
    return ok({ file: rel });
  } catch (err) {
    return fail(err);
  }
}

// ── Conflict helpers ───────────────────────────────────────
async function getConflictedFiles(folderPath) {
  const st = await status(folderPath);
  if (!st.ok || !st.data) return st;
  return ok(st.data.conflicted || []);
}

async function getProgressState(folderPath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return ok({ inMerge: false, inRebase: false, conflicted: [] });

    const gitDir = path.join(root, ".git");
    const inMerge =
      fs.existsSync(path.join(gitDir, "MERGE_HEAD")) ||
      fs.existsSync(path.join(gitDir, "CHERRY_PICK_HEAD")); // cherry-pick behaves like merge
    const inRebase =
      fs.existsSync(path.join(gitDir, "rebase-merge")) ||
      fs.existsSync(path.join(gitDir, "rebase-apply"));

    const st = await status(root);
    const conflicted = st.ok && st.data ? st.data.conflicted || [] : [];

    return ok({ inMerge, inRebase, conflicted });
  } catch (err) {
    return fail(err);
  }
}

async function chooseOurs(folderPath, filePath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.raw(["checkout", "--ours", "--", filePath]);
      await git.add([filePath]); // mark resolved
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function chooseTheirs(folderPath, filePath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.raw(["checkout", "--theirs", "--", filePath]);
      await git.add([filePath]); // mark resolved
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function markResolved(folderPath, filePath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      await git.add([filePath]); // stage as resolved
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function revertResolution(folderPath, filePath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    return await withRepoLock(root, async () => {
      const git = await getGitInstance(root);
      // restore both index & working tree for that path
      await git.raw(["restore", "-SW", "--staged", "--", filePath]);
      return ok(true);
    });
  } catch (err) {
    return fail(err);
  }
}

async function openMergetool(folderPath, filePath = undefined) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    const cmd = filePath ? `git mergetool "${filePath}"` : `git mergetool`;
    return await new Promise((resolve) => {
      exec(cmd, { cwd: root, shell: true }, (err, stdout, stderr) => {
        if (err) resolve(fail(stderr || err.message));
        else resolve(ok({ stdout, stderr }));
      });
    });
  } catch (err) {
    return fail(err);
  }
}

// Open in VS Code for the file’s 3-way conflict manually
async function openInVSCode(folderPath, filePath) {
  try {
    const root = await resolveRoot(folderPath);
    if (!root) return fail("Not a repo");
    const full = path.isAbsolute(filePath)
      ? filePath
      : path.join(root, filePath);
    const cmd = `code --wait "${full}"`;
    return await new Promise((resolve) => {
      exec(cmd, { cwd: root, shell: true }, (err, stdout, stderr) => {
        if (err) resolve(fail(stderr || err.message));
        else resolve(ok({ stdout, stderr }));
      });
    });
  } catch (err) {
    return fail(err);
  }
}

module.exports = {
  // basics
  isGitRepo,
  getGitRoot,
  status,
  remoteInfo,
  fetch,
  pull,
  push,
  setUpstream,

  // staging/commit
  addAll,
  addPaths,
  resetPaths,
  commit,
  commitPaths,

  // branches
  branches,
  createBranch,
  checkout,
  deleteBranch,

  // history/diff
  logCommits,
  diffNameOnly,
  diffFile,
  resetHard,
  revertCommit,

  // stash
  stashSave,
  stashList,
  stashPop,

  // file discard
  discardFile,

  // merge/rebase/conflicts
  merge,
  mergeAbort,
  mergeContinue,
  rebaseStart,
  rebaseContinue,
  rebaseAbort,
  getConflictedFiles,
  getProgressState,
  chooseOurs,
  chooseTheirs,
  markResolved,
  revertResolution,
  openMergetool,
  openInVSCode,
};
