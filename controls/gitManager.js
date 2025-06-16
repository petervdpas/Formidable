// controls/gitManager.js

const fileManager = require("./fileManager");
const simpleGit = require("simple-git");
const { log, warn, error } = require("./nodeLogger");

async function isGitRepo(folderPath) {
  try {
    const absPath = fileManager.resolvePath(folderPath);
    const git = simpleGit(absPath);
    return await git.checkIsRepo("root");
  } catch (err) {
    warn("[GitManager] Git check failed:", err);
    return false;
  }
}

async function getGitRoot(folderPath) {
  try {
    const absPath = fileManager.resolvePath(folderPath);
    const git = simpleGit(absPath);
    const root = await git.revparse(["--show-toplevel"]);
    return root.trim();
  } catch (err) {
    warn("[GitManager] Could not resolve Git root:", err);
    return null;
  }
}

function getGitInstance(folderPath) {
  const absPath = fileManager.resolvePath(folderPath);
  return simpleGit(absPath);
}

async function gitStatus(folderPath) {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = getGitInstance(root);
    const status = await git.status();

    // Only return plain serializable data (no functions or symbols!)
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
      files: status.files.map(f => ({
        path: f.path,
        index: f.index,
        working_dir: f.working_dir,
      })),
      clean: status.isClean?.(), // safe primitive boolean
    };
  } catch (err) {
    error("[GitManager] git status failed:", err);
    return null;
  }
}

async function getRemoteInfo(folderPath) {
  const git = simpleGit(folderPath);
  const remotes = await git.getRemotes(true); // with URLs
  const branches = await git.branch(['-r']); // list remote branches
  return { remotes, remoteBranches: branches.all };
}

async function gitPull(folderPath) {
  try {
    const root = await getGitRoot(folderPath);
    if (!root) return null;
    const git = getGitInstance(root);
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
    const git = getGitInstance(root);
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
    const git = getGitInstance(root);
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
