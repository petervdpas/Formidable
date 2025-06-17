// controls/gitManager.js

const fileManager = require("./fileManager");
const simpleGit = require("simple-git");
const { log, warn, error } = require("./nodeLogger");

const gitConfigCache = new Set();

async function getGitInstance(folderPath) {
  const absPath = fileManager.resolvePath(folderPath);
  log("[GitManager] getGitInstance for:", folderPath, " > ", absPath);

  const git = simpleGit(absPath);

  if (!gitConfigCache.has(absPath)) {
    try {
      await git.addConfig("credential.helper", "manager-core");
      await git.addConfig("credential.useHttpPath", "true");
      gitConfigCache.add(absPath);
    } catch (err) {
      warn(`[GitManager] Failed to inject config for ${absPath}:`, err);
    }
  }

  return git;
}

async function isGitRepo(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    return await git.checkIsRepo("root");
  } catch (err) {
    warn("[GitManager] Git check failed:", err);
    return false;
  }
}

async function getGitRoot(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const root = await git.revparse(["--show-toplevel"]);
    return root.trim();
  } catch (err) {
    warn("[GitManager] Could not resolve Git root:", err);
    return null;
  }
}

async function gitStatus(folderPath) {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = await getGitInstance(root);
    const status = await git.status();

    return {
      created: status.created,
      deleted: status.deleted,
      modified: status.modified,
      not_added: status.not_added,
      staged: status.staged,
      conflicted: status.conflicted,
      renamed: status.renamed,
      tracking: status.tracking,
      current: status.current,
      ahead: status.ahead,
      behind: status.behind,
      files: status.files.map((f) => ({
        path: f.path,
        index: f.index,
        working_dir: f.working_dir,
      })),
      clean: status.isClean?.(),
    };
  } catch (err) {
    error("[GitManager] git status failed:", err);
    return null;
  }
}

async function getRemoteInfo(folderPath) {
  try {
    const git = await getGitInstance(folderPath);
    const remotes = await git.getRemotes(true);
    const branches = await git.branch(["-r"]);
    return { remotes, remoteBranches: branches.all };
  } catch (err) {
    error("[GitManager] getRemoteInfo failed:", err);
    return null;
  }
}

async function gitPull(folderPath) {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = await getGitInstance(root);
    return await git.pull();
  } catch (err) {
    error("[GitManager] git pull failed:", err);
    return null;
  }
}

async function gitPush(folderPath) {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = await getGitInstance(root);
    return await git.push();
  } catch (err) {
    error("[GitManager] git push failed:", err);
    return null;
  }
}

async function gitCommit(folderPath, message = "Auto-commit by Formidable") {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = await getGitInstance(root);
    await git.add(".");
    return await git.commit(message);
  } catch (err) {
    error("[GitManager] git commit failed:", err);
    return null;
  }
}

module.exports = {
  isGitRepo,
  getGitRoot,
  gitStatus,
  getRemoteInfo,
  gitPull,
  gitPush,
  gitCommit,
};
