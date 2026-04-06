"use strict";

const fs = require("node:fs");
const path = require("node:path");

// ─── Repo Complexity Scanner ───────────────────────────────────────────
// Inspects a repository's file-system shape and emits a normalized
// complexity report with profile, confidence, signals, and reasons.

// Directories that indicate monorepo / multi-stream structure
const MONOREPO_MARKERS = ["packages", "apps", "modules", "services", "libs", "workspaces"];

// Directories that indicate infrastructure / production adjacency
const INFRA_MARKERS = ["terraform", "pulumi", "docker", "k8s", "kubernetes", "helm", "deploy", "infra", "infrastructure", ".docker"];

// Files/dirs that indicate CI/CD workflows
const CI_MARKERS = [".github/workflows", ".gitlab-ci.yml", "Jenkinsfile", ".circleci", ".travis.yml", "azure-pipelines.yml", "bitbucket-pipelines.yml"];

// File extensions grouped by language family
const LANG_EXTENSIONS = {
  javascript: [".js", ".cjs", ".mjs", ".jsx"],
  typescript: [".ts", ".tsx", ".cts", ".mts"],
  python:     [".py", ".pyx"],
  rust:       [".rs"],
  go:         [".go"],
  java:       [".java", ".kt", ".kts"],
  csharp:     [".cs"],
  ruby:       [".rb"],
  php:        [".php"],
  swift:      [".swift"],
  cpp:        [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"],
  shell:      [".sh", ".bash", ".zsh"],
};

// Directories to skip during scan
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out",
  ".next", ".nuxt", ".cache", "coverage", "__pycache__", ".tox",
  "vendor", "target", "bin", ".mesh",
]);

/**
 * Walk a directory tree up to a given depth, collecting file paths.
 * Returns { files: string[], dirs: string[] } relative to root.
 */
function walkDir(root, maxDepth = 4) {
  const files = [];
  const dirs = [];

  function recurse(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && depth > 0) continue;
      const rel = path.relative(root, path.join(dir, entry.name));
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        dirs.push(rel);
        recurse(path.join(dir, entry.name), depth + 1);
      } else {
        files.push(rel);
      }
    }
  }

  recurse(root, 0);
  return { files, dirs };
}

/**
 * Detect whether the repo has monorepo structure.
 */
function detectMonorepo(dirs, root) {
  // Check for workspace marker directories
  const topLevelDirs = dirs.filter((d) => !d.includes(path.sep));
  const hasMarkerDir = topLevelDirs.some((d) =>
    MONOREPO_MARKERS.includes(d.toLowerCase())
  );

  // Check for workspace config in package.json
  let hasWorkspaceConfig = false;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    hasWorkspaceConfig = Array.isArray(pkg.workspaces) || (pkg.workspaces && typeof pkg.workspaces === "object");
  } catch {
    // No package.json or invalid — not a workspace
  }

  // Check for pnpm-workspace.yaml or lerna.json
  const hasWorkspaceFile =
    fs.existsSync(path.join(root, "pnpm-workspace.yaml")) ||
    fs.existsSync(path.join(root, "lerna.json"));

  return hasMarkerDir || hasWorkspaceConfig || hasWorkspaceFile;
}

/**
 * Count distinct language families present in the file list.
 */
function countLanguages(files) {
  const found = new Set();
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    for (const [lang, exts] of Object.entries(LANG_EXTENSIONS)) {
      if (exts.includes(ext)) {
        found.add(lang);
        break;
      }
    }
  }
  return found.size;
}

/**
 * Detect CI/CD presence.
 */
function detectCI(dirs, files, root) {
  for (const marker of CI_MARKERS) {
    if (marker.includes("/")) {
      // Directory-based marker
      if (dirs.some((d) => d.replace(/\\/g, "/").startsWith(marker))) return true;
    } else if (marker.includes(".")) {
      // File-based marker
      if (fs.existsSync(path.join(root, marker))) return true;
    } else {
      // Plain filename
      if (files.some((f) => path.basename(f) === marker)) return true;
    }
  }
  return false;
}

/**
 * Detect infrastructure folders.
 */
function detectInfra(dirs) {
  const topLevelDirs = dirs.filter((d) => !d.includes(path.sep));
  return topLevelDirs.some((d) => INFRA_MARKERS.includes(d.toLowerCase()));
}

/**
 * Detect existing .mesh/org topology (prior structured orchestration).
 */
function detectOrgTopology(root) {
  const orgDir = path.join(root, ".mesh", "org");
  if (!fs.existsSync(orgDir)) return false;
  try {
    const entries = fs.readdirSync(orgDir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Detect existing Ghost Wing / Void activity.
 */
function detectGhostActivity(root) {
  const ghostDir = path.join(root, ".mesh", "nervous-system", "ghost-wings");
  if (!fs.existsSync(ghostDir)) return false;
  try {
    const entries = fs.readdirSync(ghostDir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Count "parallelism indicators" — top-level directories that look like
 * independent workstreams (service dirs, app dirs, etc.)
 */
function countParallelismIndicators(dirs) {
  const topLevel = dirs.filter((d) => !d.includes(path.sep));
  // Directories with their own package.json or Cargo.toml etc. are independent workstreams
  return topLevel.length;
}

/**
 * Main scanner entry point.
 *
 * @param {string} targetRoot — absolute path to the repository root
 * @returns {{ profile: string, confidence: string, signals: object, reasons: string[] }}
 */
function detectRepoComplexity(targetRoot) {
  const { files, dirs } = walkDir(targetRoot);

  const monorepo = detectMonorepo(dirs, targetRoot);
  const languageCount = countLanguages(files);
  const deploymentRisk = detectCI(dirs, files, targetRoot);
  const infraPresent = detectInfra(dirs);
  const orgTopology = detectOrgTopology(targetRoot);
  const ghostActivity = detectGhostActivity(targetRoot);
  const parallelismIndicators = countParallelismIndicators(dirs);
  const fileCount = files.length;

  const signals = {
    monorepo,
    languageCount,
    deploymentRisk,
    infraPresent,
    orgTopology,
    ghostActivity,
    parallelismIndicators,
    fileCount,
  };

  // ── Scoring ──────────────────────────────────────────────────────────
  let score = 0;
  const reasons = [];

  if (monorepo) {
    score += 3;
    reasons.push("Multi-package workspace structure detected");
  }

  if (languageCount >= 3) {
    score += 2;
    reasons.push(`${languageCount} language families detected — cross-domain coordination likely`);
  } else if (languageCount === 2) {
    score += 1;
    reasons.push(`${languageCount} language families detected`);
  }

  if (deploymentRisk) {
    score += 1;
    reasons.push("CI/CD deployment workflows present");
  }

  if (infraPresent) {
    score += 2;
    reasons.push("Infrastructure-as-code directories detected — production adjacency");
  }

  if (orgTopology) {
    score += 1;
    reasons.push("Existing org topology found — prior structured orchestration");
  }

  if (ghostActivity) {
    score += 1;
    reasons.push("Ghost Wing activity detected — adaptive routing in use");
  }

  if (parallelismIndicators >= 8) {
    score += 2;
    reasons.push("High directory breadth suggests multi-stream coordination");
  } else if (parallelismIndicators >= 4) {
    score += 1;
    reasons.push("Moderate directory breadth detected");
  }

  if (fileCount >= 500) {
    score += 2;
    reasons.push(`Large codebase (${fileCount} files scanned)`);
  } else if (fileCount >= 100) {
    score += 1;
    reasons.push(`Medium codebase (${fileCount} files scanned)`);
  }

  // ── Profile resolution ───────────────────────────────────────────────
  let profile;
  if (score >= 7) {
    profile = "heavy";
  } else if (score >= 3) {
    profile = "medium";
  } else {
    profile = "light";
  }

  // Experimental override: if the repo has R&D signals but is not heavy
  // (vanguard config, experimental branches, lab/experiment dirs)
  const experimentalDirs = dirs.filter((d) => {
    const name = path.basename(d).toLowerCase();
    return ["experiments", "lab", "labs", "prototypes", "spikes", "r&d", "research"].includes(name);
  });
  if (experimentalDirs.length > 0 && profile !== "heavy") {
    profile = "experimental";
    reasons.push("R&D / experimental directories detected");
  }

  // Confidence: based on how many signals fired
  const signalsFired = reasons.length;
  let confidence;
  if (signalsFired >= 4) {
    confidence = "high";
  } else if (signalsFired >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  if (reasons.length === 0) {
    reasons.push("Minimal repository structure — conservative defaults recommended");
  }

  return { profile, confidence, signals, reasons };
}

module.exports = { detectRepoComplexity };
