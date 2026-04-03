#!/usr/bin/env node
/**
 * Worktree Manager — Parallel Wing Execution via Git Worktrees
 *
 * Enables Wings (including Ghost Wings) to operate in isolated git
 * worktrees, each on its own branch. This allows true parallel
 * execution: multiple agents working on separate branches without
 * file-level conflicts.
 *
 * Lifecycle integration:
 *   materialize → createWorktree()   (new branch + isolated directory)
 *   solidify    → mergeWorktree()    (merge branch, remove worktree)
 *   dissolve    → removeWorktree()   (discard branch, clean up)
 *
 * Branching convention: mesh/{issueNumber}-{slug}
 * Worktree directory: {baseDir}/mesh-{ghostId}
 *
 * Storage: worktree metadata is persisted in ghost-meta.json
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// ─── Git Helpers ────────────────────────────────────────────────────────────

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitSafe(args, cwd) {
  try {
    return { ok: true, output: git(args, cwd) };
  } catch (err) {
    return { ok: false, error: err.stderr || err.message };
  }
}

/**
 * Find the git repository root for a given path.
 */
function findRepoRoot(cwd) {
  const result = gitSafe(['rev-parse', '--show-toplevel'], cwd);
  return result.ok ? result.output : null;
}

/**
 * List all git worktrees for the repository.
 * Returns array of { path, branch, head, bare }
 */
function listWorktrees(repoRoot) {
  const result = gitSafe(['worktree', 'list', '--porcelain'], repoRoot);
  if (!result.ok) return [];

  const worktrees = [];
  let current = {};

  for (const line of result.output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current);
      current = { path: line.slice(9) };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === 'bare') {
      current.bare = true;
    } else if (line === '' && current.path) {
      worktrees.push(current);
      current = {};
    }
  }
  if (current.path) worktrees.push(current);

  return worktrees;
}

/**
 * List only mesh-managed worktrees (branch starts with mesh/).
 */
function listMeshWorktrees(repoRoot) {
  return listWorktrees(repoRoot).filter(
    (wt) => wt.branch && wt.branch.startsWith('mesh/'),
  );
}

// ─── Worktree Operations ────────────────────────────────────────────────────

/**
 * Create a git worktree for a Wing.
 *
 * @param {object} options
 * @param {string} options.repoRoot - Git repo root
 * @param {string} options.wingId - Wing or Ghost Wing ID
 * @param {string} options.branchName - Target branch name (e.g. 'mesh/42-auth-api')
 * @param {string} [options.baseBranch='dev'] - Branch to base off of
 * @param {string} [options.baseDir] - Parent directory for worktree (default: repo's parent)
 * @param {string} [options.worktreePrefix='mesh-'] - Prefix for worktree directory name
 * @returns {object} { success, worktreePath, branchName, error? }
 */
function createWorktree(options) {
  const {
    repoRoot,
    wingId,
    branchName,
    baseBranch = 'dev',
    baseDir,
    worktreePrefix = 'mesh-',
  } = options;

  const worktreeDir = baseDir
    ? path.join(baseDir, `${worktreePrefix}${wingId}`)
    : path.join(path.dirname(repoRoot), `${worktreePrefix}${wingId}`);

  // Check if worktree already exists
  if (fs.existsSync(worktreeDir)) {
    return {
      success: false,
      worktreePath: worktreeDir,
      branchName,
      error: `Worktree directory already exists: ${worktreeDir}`,
    };
  }

  // Check if branch already exists
  const branchCheck = gitSafe(['rev-parse', '--verify', branchName], repoRoot);

  if (branchCheck.ok) {
    // Branch exists — open worktree on existing branch
    const result = gitSafe(['worktree', 'add', worktreeDir, branchName], repoRoot);
    if (!result.ok) {
      return { success: false, worktreePath: worktreeDir, branchName, error: result.error };
    }
  } else {
    // Create new branch from baseBranch
    const baseRef = gitSafe(['rev-parse', '--verify', baseBranch], repoRoot);
    const startPoint = baseRef.ok ? baseBranch : 'HEAD';

    const result = gitSafe(
      ['worktree', 'add', '-b', branchName, worktreeDir, startPoint],
      repoRoot,
    );
    if (!result.ok) {
      return { success: false, worktreePath: worktreeDir, branchName, error: result.error };
    }
  }

  return { success: true, worktreePath: worktreeDir, branchName };
}

/**
 * Remove a git worktree and optionally delete its branch.
 *
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {string} options.worktreePath - Absolute path to worktree
 * @param {boolean} [options.deleteBranch=false] - Whether to delete the branch too
 * @param {string} [options.branchName] - Branch to delete (required if deleteBranch=true)
 * @returns {object} { success, removed, branchDeleted, error? }
 */
function removeWorktree(options) {
  const { repoRoot, worktreePath, deleteBranch = false, branchName } = options;

  // Force remove the worktree
  const result = gitSafe(['worktree', 'remove', '--force', worktreePath], repoRoot);
  if (!result.ok) {
    // Try pruning stale worktrees first
    gitSafe(['worktree', 'prune'], repoRoot);
    // If directory still exists, remove manually
    if (fs.existsSync(worktreePath)) {
      try {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      } catch {
        return { success: false, removed: false, branchDeleted: false, error: result.error };
      }
    }
  }

  // Prune worktree metadata
  gitSafe(['worktree', 'prune'], repoRoot);

  let branchDeleted = false;
  if (deleteBranch && branchName) {
    const delResult = gitSafe(['branch', '-D', branchName], repoRoot);
    branchDeleted = delResult.ok;
  }

  return { success: true, removed: true, branchDeleted };
}

/**
 * Merge a worktree's branch back to a target branch, then clean up.
 *
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {string} options.worktreePath
 * @param {string} options.branchName - The worktree's branch
 * @param {string} [options.targetBranch='dev'] - Branch to merge into
 * @param {boolean} [options.deleteAfterMerge=true]
 * @returns {object} { success, merged, conflicted, cleaned, error? }
 */
function mergeWorktree(options) {
  const {
    repoRoot,
    worktreePath,
    branchName,
    targetBranch = 'dev',
    deleteAfterMerge = true,
  } = options;

  // First, check that the branch has commits
  const logResult = gitSafe(
    ['log', `${targetBranch}..${branchName}`, '--oneline', '--no-decorate'],
    repoRoot,
  );

  const hasCommits = logResult.ok && logResult.output.length > 0;

  if (!hasCommits) {
    // No new commits — just clean up
    if (deleteAfterMerge) {
      removeWorktree({ repoRoot, worktreePath, deleteBranch: true, branchName });
    }
    return { success: true, merged: false, conflicted: false, cleaned: deleteAfterMerge, reason: 'no-commits' };
  }

  // Attempt merge
  const mergeResult = gitSafe(
    ['merge', '--no-ff', branchName, '-m', `Merge ${branchName} (solidified Ghost Wing)`],
    repoRoot,
  );

  if (!mergeResult.ok) {
    // Abort the merge if it conflicted
    gitSafe(['merge', '--abort'], repoRoot);
    return {
      success: false,
      merged: false,
      conflicted: true,
      cleaned: false,
      error: `Merge conflict merging ${branchName} into ${targetBranch}. Manual resolution required.`,
    };
  }

  // Clean up worktree + branch
  if (deleteAfterMerge) {
    removeWorktree({ repoRoot, worktreePath, deleteBranch: true, branchName });
  }

  return { success: true, merged: true, conflicted: false, cleaned: deleteAfterMerge };
}

// ─── Reconciliation ─────────────────────────────────────────────────────────

/**
 * Detect orphaned worktrees (worktrees without matching Ghost Wings)
 * and stale Ghost Wings (Ghost Wings without matching worktrees).
 *
 * @param {string} repoRoot
 * @param {string} meshDir - Path to .mesh/
 * @returns {{ orphanedWorktrees: Array, staleGhosts: Array, healthy: Array }}
 */
function reconcileWorktrees(repoRoot, meshDir) {
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  const worktrees = listMeshWorktrees(repoRoot);

  let ghosts = [];
  if (fs.existsSync(structurePath)) {
    try {
      const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      ghosts = (structure.departments || []).filter((d) => d._ghost);
    } catch {
      // Proceed with empty
    }
  }

  // Build lookup of ghost IDs with worktree metadata
  const ghostWorktreePaths = new Set();
  for (const ghost of ghosts) {
    const metaPath = path.join(meshDir, 'org', ghost.id, 'ghost-meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.worktree && meta.worktree.path) {
          ghostWorktreePaths.add(path.resolve(meta.worktree.path));
        }
      } catch {
        // Skip
      }
    }
  }

  const orphanedWorktrees = worktrees.filter(
    (wt) => !ghostWorktreePaths.has(path.resolve(wt.path)),
  );

  const worktreePathSet = new Set(worktrees.map((wt) => path.resolve(wt.path)));
  const staleGhosts = ghosts.filter((ghost) => {
    const metaPath = path.join(meshDir, 'org', ghost.id, 'ghost-meta.json');
    if (!fs.existsSync(metaPath)) return false;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return meta.worktree && meta.worktree.path && !worktreePathSet.has(path.resolve(meta.worktree.path));
    } catch {
      return false;
    }
  });

  const healthy = ghosts.filter((ghost) => {
    const metaPath = path.join(meshDir, 'org', ghost.id, 'ghost-meta.json');
    if (!fs.existsSync(metaPath)) return false;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return meta.worktree && meta.worktree.path && worktreePathSet.has(path.resolve(meta.worktree.path));
    } catch {
      return false;
    }
  });

  return { orphanedWorktrees, staleGhosts, healthy };
}

// ─── Ghost Wing Integration Helpers ─────────────────────────────────────────

/**
 * Persist worktree metadata into a Ghost Wing's ghost-meta.json.
 *
 * @param {string} meshDir
 * @param {string} ghostId
 * @param {object} worktreeInfo - { path, branchName, createdAt }
 */
function saveWorktreeMetadata(meshDir, ghostId, worktreeInfo) {
  const metaPath = path.join(meshDir, 'org', ghostId, 'ghost-meta.json');
  if (!fs.existsSync(metaPath)) return;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.worktree = {
    path: worktreeInfo.path,
    branchName: worktreeInfo.branchName,
    createdAt: worktreeInfo.createdAt || new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

/**
 * Read worktree metadata from a Ghost Wing's ghost-meta.json.
 */
function loadWorktreeMetadata(meshDir, ghostId) {
  const metaPath = path.join(meshDir, 'org', ghostId, 'ghost-meta.json');
  if (!fs.existsSync(metaPath)) return null;

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return meta.worktree || null;
  } catch {
    return null;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  findRepoRoot,
  listWorktrees,
  listMeshWorktrees,
  createWorktree,
  removeWorktree,
  mergeWorktree,
  reconcileWorktrees,
  saveWorktreeMetadata,
  loadWorktreeMetadata,
};
