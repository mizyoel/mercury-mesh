#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const VERSION = require(path.join(PACKAGE_ROOT, "package.json")).version;

// ─── Asset manifest ────────────────────────────────────────────────────
// Each entry: { src (relative to package root), dest (relative to target project root), type }
// type: "file" = single file, "dir" = recursive directory copy

const SCAFFOLD_MANIFEST = [
  // Agent prompt
  {
    src: ".github/agents/mercury-mesh.agent.md",
    dest: ".github/agents/mercury-mesh.agent.md",
    type: "file",
  },
  // Copilot coding-agent instructions
  {
    src: ".mesh/templates/copilot-instructions.md",
    dest: ".github/copilot-instructions.md",
    type: "file",
  },
  // Skills directory (all skills)
  {
    src: ".copilot/skills",
    dest: ".copilot/skills",
    type: "dir",
  },
  // MCP config (example, never overwrite)
  {
    src: ".copilot/mcp-config.json",
    dest: ".copilot/mcp-config.json",
    type: "file",
  },
  // Mesh runtime manifesto
  {
    src: ".mesh/manifesto.md",
    dest: ".mesh/manifesto.md",
    type: "file",
  },
  // Mesh routing rules
  {
    src: ".mesh/templates/routing.md",
    dest: ".mesh/routing.md",
    type: "file",
  },
  // Ceremonies
  {
    src: ".mesh/templates/ceremonies.md",
    dest: ".mesh/ceremonies.md",
    type: "file",
  },
  // Local machine overrides (git-ignored)
  {
    src: ".mesh/templates/local.json",
    dest: ".mesh/local.json",
    type: "file",
  },
  // GitHub workflows
  {
    src: ".mesh/templates/workflows",
    dest: ".github/workflows",
    type: "dir",
  },
];

// Files that should be appended to .gitignore if not already present
const GITIGNORE_LINES = [
  "# Mercury Mesh: runtime state (logs, inbox, sessions)",
  ".mesh/orchestration-log/",
  ".mesh/log/",
  ".mesh/decisions/inbox/",
  ".mesh/sessions/",
  ".mesh/local.json",
  ".mesh-workstream",
];

// ─── Helpers ───────────────────────────────────────────────────────────

function log(msg) {
  console.log(`  ${msg}`);
}

function heading(msg) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${"─".repeat(60)}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileIfMissing(src, dest, { force = false } = {}) {
  if (fs.existsSync(dest) && !force) {
    log(`skip  ${dest}  (already exists)`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  log(`write ${dest}`);
  return true;
}

function copyDirRecursive(srcDir, destDir, { force = false } = {}) {
  let count = 0;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath, { force });
    } else {
      if (copyFileIfMissing(srcPath, destPath, { force })) count++;
    }
  }
  return count;
}

function patchGitignore(targetRoot) {
  const gitignorePath = path.join(targetRoot, ".gitignore");
  let content = "";
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf-8");
  }

  const missing = GITIGNORE_LINES.filter(
    (line) => !line.startsWith("#") && !content.includes(line)
  );

  if (missing.length === 0) {
    log("skip  .gitignore  (entries already present)");
    return;
  }

  const block = "\n" + GITIGNORE_LINES.join("\n") + "\n";
  fs.writeFileSync(gitignorePath, content.trimEnd() + "\n" + block, "utf-8");
  log("patch .gitignore  (added mesh runtime ignores)");
}

function writeDefaultConfig(targetRoot) {
  const configPath = path.join(targetRoot, ".mesh", "config.json");
  if (fs.existsSync(configPath)) {
    log("skip  .mesh/config.json  (already exists)");
    return;
  }
  ensureDir(path.dirname(configPath));
  const defaultConfig = {
    version: 2,
    orgMode: false,
    halted: false,
    allowedModels: ["gpt-5.4", "claude-opus-4.6"],
    modelRouting: {
      default: "gpt-5.4",
      fallbacks: {
        premium: ["claude-opus-4.6", "gpt-5.4"],
        standard: ["gpt-5.4"],
        fast: ["gpt-5.4"],
      },
    },
    humanTiers: { tier1: [], tier2: [], tier3: [] },
    onboarding: { defaultPhase: "shadow", autoPromoteThreshold: false },
    nervousSystem: {
      enabled: false,
      embeddingProvider: "tfidf",
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + "\n", "utf-8");
  log("write .mesh/config.json  (default — nervous system off)");
}

function stampVersion(targetRoot) {
  const agentFile = path.join(
    targetRoot,
    ".github",
    "agents",
    "mercury-mesh.agent.md"
  );
  if (!fs.existsSync(agentFile)) return;
  let content = fs.readFileSync(agentFile, "utf-8");
  const stamped = content.replace(
    /<!-- version: [\d.]+ -->/,
    `<!-- version: ${VERSION} -->`
  );
  if (stamped !== content) {
    fs.writeFileSync(agentFile, stamped, "utf-8");
    log(`stamp .github/agents/mercury-mesh.agent.md → v${VERSION}`);
  }
}

// ─── Commands ──────────────────────────────────────────────────────────

function runInit(targetRoot, flags) {
  heading(`Mercury Mesh v${VERSION} — Init`);
  log(`target: ${targetRoot}\n`);

  let filesWritten = 0;

  for (const entry of SCAFFOLD_MANIFEST) {
    const src = path.join(PACKAGE_ROOT, entry.src);
    const dest = path.join(targetRoot, entry.dest);

    if (!fs.existsSync(src)) {
      log(`warn  ${entry.src}  (source missing in package — skipping)`);
      continue;
    }

    if (entry.type === "dir") {
      filesWritten += copyDirRecursive(src, dest, { force: flags.force });
    } else {
      if (copyFileIfMissing(src, dest, { force: flags.force })) filesWritten++;
    }
  }

  writeDefaultConfig(targetRoot);
  patchGitignore(targetRoot);
  stampVersion(targetRoot);

  heading("Init complete");
  log(`${filesWritten} file(s) written.`);
  log("Existing files were preserved (use --force to overwrite).\n");
  log("Next steps:");
  log("  1. Open VS Code in this project");
  log("  2. Add your OpenRouter key to .mesh/local.json if you want semantic routing");
  log('  3. Chat with @mercury-mesh — say "declare the mission"');
  log("  4. The bridge will cast your crew and scaffold team.md\n");
}

function runUpdate(targetRoot) {
  heading(`Mercury Mesh v${VERSION} — Update`);
  log(`target: ${targetRoot}\n`);

  // Only update the agent prompt and skills (not config or team files)
  const updateEntries = SCAFFOLD_MANIFEST.filter(
    (e) =>
      e.dest.startsWith(".github/agents/") ||
      e.dest.startsWith(".copilot/skills/") ||
      e.dest === ".github/copilot-instructions.md"
  );

  let filesWritten = 0;
  for (const entry of updateEntries) {
    const src = path.join(PACKAGE_ROOT, entry.src);
    const dest = path.join(targetRoot, entry.dest);

    if (!fs.existsSync(src)) continue;

    if (entry.type === "dir") {
      filesWritten += copyDirRecursive(src, dest, { force: true });
    } else {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      log(`write ${dest}`);
      filesWritten++;
    }
  }

  stampVersion(targetRoot);

  heading("Update complete");
  log(`${filesWritten} file(s) updated (agent prompt + skills + instructions).\n`);
}

function resolveGitHubCliToken() {
  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(
      "GitHub CLI auth required locally. Install `gh` and run `gh auth login` before starting the GitHub MCP server."
    );
  }
}

function runGitHubMcp() {
  const token = resolveGitHubCliToken();
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(npxCommand, ["-y", "@anthropic/github-mcp-server"], {
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_TOKEN: token,
    },
  });

  child.on("error", (error) => {
    console.error(`Failed to start GitHub MCP server: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function printUsage() {
  console.log(`
Mercury Mesh v${VERSION} — CLI

Usage:
  npx @mizyoel/mercury-mesh init    [--force] [--target <path>]
  npx @mizyoel/mercury-mesh github-mcp
  npx @mizyoel/mercury-mesh update  [--target <path>]
  npx @mizyoel/mercury-mesh version

Commands:
  init     Scaffold Copilot agent, skills, workflows, and .mesh/ runtime
           into the target project. Existing files are preserved unless --force.
  github-mcp  Start the GitHub MCP server using gh auth token for local auth.
  update   Overwrite agent prompt, skills, and copilot-instructions with the
           latest from this package version. Config and team files are untouched.
  version  Print package version.

Options:
  --force          Overwrite existing files during init
  --target <path>  Target project root (default: current working directory)
`);
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("-"));

  const flags = {
    force: args.includes("--force"),
  };

  // Parse --target
  let targetRoot = process.cwd();
  const targetIdx = args.indexOf("--target");
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    targetRoot = path.resolve(args[targetIdx + 1]);
  }

  switch (command) {
    case "init":
      runInit(targetRoot, flags);
      break;
    case "github-mcp":
      runGitHubMcp();
      break;
    case "update":
      runUpdate(targetRoot);
      break;
    case "version":
      console.log(VERSION);
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main();
