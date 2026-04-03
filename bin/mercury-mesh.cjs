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

// ─── Doctor ────────────────────────────────────────────────────────────

const DOCTOR_CHECKS = {
  // Existence checks: [relativePath, label, required]
  structure: [
    [".mesh/config.json", "Runtime config", true],
    [".mesh/manifesto.md", "Flight Path (manifesto)", true],
    [".mesh/routing.md", "Routing rules", false],
    [".mesh/ceremonies.md", "Ceremonies", false],
    [".mesh/local.json", "Local overrides (git-ignored)", false],
    [".mesh/team.md", "Team roster", false],
    [".github/agents/mercury-mesh.agent.md", "Agent prompt", true],
    [".github/copilot-instructions.md", "Copilot instructions", false],
    [".copilot/skills", "Skills directory", true],
    [".copilot/mcp-config.json", "MCP config", false],
  ],
  configRequiredKeys: [
    "version",
    "halted",
    "humanTiers",
    "modelRouting",
    "nervousSystem",
  ],
};

function runDoctor(targetRoot) {
  heading(`Mercury Mesh v${VERSION} — Doctor`);
  log(`target: ${targetRoot}\n`);

  const results = { pass: 0, warn: 0, fail: 0 };

  function pass(msg) {
    results.pass++;
    log(`  ✓  ${msg}`);
  }
  function warn(msg) {
    results.warn++;
    log(`  ⚠  ${msg}`);
  }
  function fail(msg) {
    results.fail++;
    log(`  ✗  ${msg}`);
  }

  // ── 1. Structure ──────────────────────────────────────────────────
  log("Structure\n");

  for (const [rel, label, required] of DOCTOR_CHECKS.structure) {
    const full = path.join(targetRoot, rel);
    if (fs.existsSync(full)) {
      pass(`${label}  ${rel}`);
    } else if (required) {
      fail(`${label}  ${rel}  — missing (run \`npx mercury-mesh init\`)`);
    } else {
      warn(`${label}  ${rel}  — not found (optional)`);
    }
  }

  // ── 2. Config schema ──────────────────────────────────────────────
  log("\nConfig\n");

  const configPath = path.join(targetRoot, ".mesh", "config.json");
  let config = null;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      pass("config.json parses as valid JSON");
    } catch (e) {
      fail(`config.json parse error: ${e.message}`);
    }
  }

  if (config) {
    for (const key of DOCTOR_CHECKS.configRequiredKeys) {
      if (config[key] !== undefined) {
        pass(`config.${key} present`);
      } else {
        fail(`config.${key} missing`);
      }
    }

    // Version check
    if (typeof config.version === "number" && config.version >= 2) {
      pass(`config.version = ${config.version}`);
    } else {
      warn(`config.version = ${config.version} (expected ≥ 2)`);
    }

    // Human tiers
    if (config.humanTiers) {
      const t1 = config.humanTiers.tier1 || [];
      if (t1.length > 0) {
        pass(`Tier-1 commanders: ${t1.join(", ")}`);
      } else {
        warn("No Tier-1 commanders registered — bridge is unclaimed");
      }
    }

    // Model routing
    if (config.modelRouting && config.modelRouting.default) {
      pass(`Default model: ${config.modelRouting.default}`);
    } else if (config.modelRouting) {
      warn("modelRouting.default not set");
    }
  }

  // ── 3. Agent prompt version stamp ─────────────────────────────────
  log("\nAgent Prompt\n");

  const agentPath = path.join(
    targetRoot,
    ".github",
    "agents",
    "mercury-mesh.agent.md"
  );
  if (fs.existsSync(agentPath)) {
    const agentContent = fs.readFileSync(agentPath, "utf-8");
    const match = agentContent.match(/<!-- version: ([\d.]+) -->/);
    if (match) {
      if (match[1] === VERSION) {
        pass(`Agent prompt version: ${match[1]} (current)`);
      } else {
        warn(
          `Agent prompt version: ${match[1]} (package is ${VERSION} — run \`npx mercury-mesh update\`)`
        );
      }
    } else {
      warn("Agent prompt has no version stamp");
    }
  }

  // ── 4. Skills sync check ──────────────────────────────────────────
  log("\nSkills\n");

  const liveSkillsDir = path.join(targetRoot, ".copilot", "skills");
  const templateSkillsDir = path.join(PACKAGE_ROOT, ".mesh", "templates", "skills");

  if (fs.existsSync(liveSkillsDir) && fs.existsSync(templateSkillsDir)) {
    const liveSkills = fs
      .readdirSync(liveSkillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const templateSkills = fs
      .readdirSync(templateSkillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    pass(`${liveSkills.length} live skill(s) installed`);

    const missing = templateSkills.filter((s) => !liveSkills.includes(s));
    const extra = liveSkills.filter((s) => !templateSkills.includes(s));

    if (missing.length > 0) {
      warn(`Missing from live: ${missing.join(", ")}  (run \`npx mercury-mesh update\`)`);
    }
    if (extra.length > 0) {
      pass(`${extra.length} custom skill(s): ${extra.join(", ")}`);
    }
    if (missing.length === 0 && extra.length === 0) {
      pass("Live skills in sync with package templates");
    }
  } else if (!fs.existsSync(liveSkillsDir)) {
    fail("Skills directory missing — run `npx mercury-mesh init`");
  }

  // ── 5. Nervous system ─────────────────────────────────────────────
  log("\nNervous System\n");

  if (config && config.nervousSystem) {
    const ns = config.nervousSystem;

    if (!ns.enabled) {
      log("    Nervous system disabled in config (nominal for default installs)");
    } else {
      pass("Nervous system enabled");

      const provider = ns.embeddingProvider || "tfidf";
      pass(`Embedding provider: ${provider}`);

      if (provider === "tfidf") {
        pass("TF-IDF requires no external configuration");
      } else if (provider === "openrouter" || provider === "llm") {
        // Check for API key in config (merged from local.json) or env
        const localPath = path.join(targetRoot, ".mesh", "local.json");
        let localConfig = {};
        if (fs.existsSync(localPath)) {
          try {
            localConfig = JSON.parse(fs.readFileSync(localPath, "utf-8"));
          } catch {
            warn("local.json exists but failed to parse");
          }
        }

        const localKey =
          localConfig.nervousSystem && localConfig.nervousSystem.embeddingApiKey;
        const envVarName = provider === "openrouter" ? "OPENROUTER_API_KEY"
          : provider === "llm" ? "OPENAI_API_KEY"
          : null;
        const envKey = envVarName ? process.env[envVarName]
          : (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
        const envSource = envVarName && process.env[envVarName] ? envVarName
          : process.env.OPENROUTER_API_KEY ? "OPENROUTER_API_KEY"
          : process.env.OPENAI_API_KEY ? "OPENAI_API_KEY"
          : null;

        if (localKey) {
          pass(`Embedding API key configured in .mesh/local.json (${localKey.slice(0, 6)}…)`);
        } else if (envKey) {
          pass(`Embedding API key auto-discovered from $${envSource}`);
        } else {
          fail(
            `No embedding API key for provider "${provider}" — add to .mesh/local.json or set ${envVarName || "OPENROUTER_API_KEY"} env var`
          );
        }

        if (ns.embeddingModel) {
          pass(`Embedding model: ${ns.embeddingModel}`);
        } else {
          pass("Embedding model: provider default");
        }
      }
    }
  } else if (config) {
    warn("nervousSystem key missing from config.json");
  }

  // ── 6. Gitignore ──────────────────────────────────────────────────
  log("\nGitignore\n");

  const gitignorePath = path.join(targetRoot, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gi = fs.readFileSync(gitignorePath, "utf-8");
    const criticalIgnores = [".mesh/local.json", ".mesh/log/", ".mesh/sessions/"];
    let allPresent = true;
    for (const pattern of criticalIgnores) {
      if (!gi.includes(pattern)) {
        warn(`${pattern} not in .gitignore — secrets may leak`);
        allPresent = false;
      }
    }
    if (allPresent) {
      pass("Critical paths ignored (.mesh/local.json, log, sessions)");
    }
  } else {
    warn(".gitignore not found");
  }

  // ── Summary ───────────────────────────────────────────────────────
  heading("Diagnosis");

  const total = results.pass + results.warn + results.fail;
  log(`${results.pass}/${total} passed  ·  ${results.warn} warning(s)  ·  ${results.fail} failure(s)\n`);

  if (results.fail > 0) {
    log("HULL BREACH — resolve failures above before flight.\n");
    return 1;
  } else if (results.warn > 0) {
    log("HULL INTACT — minor drift detected. Review warnings.\n");
    return 0;
  } else {
    log("ALL SYSTEMS NOMINAL — ready for sortie.\n");
    return 0;
  }
}

// ─── Status ────────────────────────────────────────────────────────────

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function parseTeamRoster(teamPath) {
  if (!fs.existsSync(teamPath)) return null;
  const content = fs.readFileSync(teamPath, "utf-8");
  const lines = content.split(/\r?\n/);
  const members = [];

  // Find the Members table (has Status column)
  let inMembersTable = false;
  let headers = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
      if (inMembersTable && headers) break; // end of table
      inMembersTable = false;
      headers = null;
      continue;
    }

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

    // Skip separator rows
    if (cells.every((c) => /^-+$/.test(c))) continue;

    if (!headers) {
      // Check if this is the members table header
      const lower = cells.map((c) => c.toLowerCase());
      if (lower.includes("status")) {
        headers = lower;
        inMembersTable = true;
      }
      continue;
    }

    if (inMembersTable) {
      const entry = {};
      headers.forEach((h, i) => {
        entry[h] = cells[i] || "";
      });
      members.push(entry);
    }
  }

  return members;
}

function countDirEntries(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  try {
    return fs.readdirSync(dirPath).length;
  } catch {
    return 0;
  }
}

function latestSessionInfo(sessionsDir) {
  if (!fs.existsSync(sessionsDir)) return null;
  const files = fs
    .readdirSync(sessionsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;

  const data = readJsonSafe(path.join(sessionsDir, files[0]));
  if (!data) return null;
  return {
    id: data.id || files[0].replace(".json", ""),
    createdAt: data.createdAt || null,
    lastActiveAt: data.lastActiveAt || null,
    messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
  };
}

function runStatus(targetRoot) {
  const meshDir = path.join(targetRoot, ".mesh");
  const configPath = path.join(meshDir, "config.json");

  if (!fs.existsSync(configPath)) {
    heading(`Mercury Mesh v${VERSION} — Status`);
    log("target: " + targetRoot + "\n");
    log("No .mesh/config.json found. Run `npx mercury-mesh init` first.\n");
    return 1;
  }

  const config = readJsonSafe(configPath);
  if (!config) {
    heading(`Mercury Mesh v${VERSION} — Status`);
    log("Failed to parse .mesh/config.json.\n");
    return 1;
  }

  // Merge local.json
  const localConfig = readJsonSafe(path.join(meshDir, "local.json")) || {};
  const ns = {
    ...(config.nervousSystem || {}),
    ...(localConfig.nervousSystem || {}),
  };

  // Team roster
  const members = parseTeamRoster(path.join(meshDir, "team.md"));
  const statusCounts = { shadow: 0, probation: 0, active: 0 };
  if (members) {
    for (const m of members) {
      const s = (m.status || "").toLowerCase();
      if (s in statusCounts) statusCounts[s]++;
    }
  }

  // Org structure
  const structurePath = path.join(meshDir, "org", "structure.json");
  const structure = readJsonSafe(structurePath);
  const departments = structure && Array.isArray(structure.departments)
    ? structure.departments
    : [];
  const ghostDepts = departments.filter((d) => d._ghost || d.lifecycle === "ghost");
  const activeDepts = departments.filter((d) => !d._ghost && d.lifecycle !== "ghost");

  // Decisions inbox
  const inboxCount = countDirEntries(path.join(meshDir, "decisions", "inbox"));

  // Constellation memory
  const constellationDir = path.join(meshDir, "nervous-system", "constellation");
  const lancedbDir = path.join(meshDir, "nervous-system", "constellation-lancedb");
  const constellationProvider = (ns && ns.constellation && ns.constellation.provider) || "json";
  const manifest = readJsonSafe(path.join(constellationDir, "manifest.json"));
  const constellationIndex = readJsonSafe(path.join(constellationDir, "index.json"));
  const jsonEntryCount = Array.isArray(constellationIndex)
    ? constellationIndex.length
    : manifest
      ? manifest.entryCount || 0
      : 0;
  const hasLanceDB = fs.existsSync(lancedbDir);
  const entryCount = constellationProvider === "lancedb" && hasLanceDB ? "lancedb" : jsonEntryCount;

  // Sessions
  const sessionsDir = path.join(meshDir, "sessions");
  const sessionCount = countDirEntries(sessionsDir);
  const lastSession = latestSessionInfo(sessionsDir);

  // Agent prompt version
  const agentPath = path.join(
    targetRoot,
    ".github",
    "agents",
    "mercury-mesh.agent.md"
  );
  let agentVersion = null;
  if (fs.existsSync(agentPath)) {
    const match = fs.readFileSync(agentPath, "utf-8").match(/<!-- version: ([\d.]+) -->/);
    if (match) agentVersion = match[1];
  }

  // Render
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERCURY MESH v${VERSION}  —  BRIDGE TELEMETRY                ${" ".repeat(Math.max(0, 26 - VERSION.length))}│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYSTEM STATE                                                               │`);

  const halted = config.halted ? "YES ■ ALL STOP" : "NO";
  const orgMode = config.orgMode ? "ENABLED" : "DISABLED";
  const haltBar = config.halted
    ? "░░░░░░░░░░░░░░░░░░░░  HALTED"
    : "████████████████████  ONLINE";

  console.log(`│    Halted          ${pad(halted, 52)}│`);
  console.log(`│    Org Mode        ${pad(orgMode, 52)}│`);
  console.log(`│    Bridge Status   ${pad(haltBar, 52)}│`);
  console.log(`│    Agent Prompt    ${pad(agentVersion ? `v${agentVersion}${agentVersion !== VERSION ? ` (package: v${VERSION})` : ""}` : "not found", 52)}│`);
  console.log(`│    Default Model   ${pad((config.modelRouting && config.modelRouting.default) || "—", 52)}│`);

  console.log(`│                                                                             │`);
  console.log(`│  CREW                                                                       │`);

  if (members && members.length > 0) {
    console.log(`│    Roster          ${pad(`${members.length} Wing(s)`, 52)}│`);
    console.log(`│    Active          ${pad(String(statusCounts.active), 52)}│`);
    console.log(`│    Probation       ${pad(String(statusCounts.probation), 52)}│`);
    console.log(`│    Shadow          ${pad(String(statusCounts.shadow), 52)}│`);
  } else {
    console.log(`│    Roster          ${pad("EMPTY — bridge unclaimed", 52)}│`);
  }

  console.log(`│                                                                             │`);
  console.log(`│  ORGANIZATION                                                               │`);
  console.log(`│    Departments     ${pad(String(activeDepts.length), 52)}│`);
  console.log(`│    Ghost Wings     ${pad(String(ghostDepts.length) + (ns.ghostWings && ns.ghostWings.autoMaterialize ? " (auto-materialize)" : " (manual approval)"), 52)}│`);
  console.log(`│    Decisions       ${pad(inboxCount > 0 ? `${inboxCount} pending in inbox` : "inbox clear", 52)}│`);

  console.log(`│                                                                             │`);
  console.log(`│  NERVOUS SYSTEM                                                             │`);

  if (ns.enabled) {
    const provider = ns.embeddingProvider || "tfidf";
    const hasKey = !!(ns.embeddingApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
    const keyStatus = provider === "tfidf" ? "—" : hasKey ? "configured" : "MISSING";

    console.log(`│    Status          ${pad("ONLINE", 52)}│`);
    console.log(`│    Phase I         ${pad(`Gravimetry     :: ${provider}${provider !== "tfidf" ? ` (key: ${keyStatus})` : ""}`, 52)}│`);
    console.log(`│    Phase II        ${pad(`Autonomic Core :: pulse ${(ns.autonomic && ns.autonomic.pulseMs) || 30000}ms`, 52)}│`);
    console.log(`│    Phase III       ${pad(`Ghost Wings    :: ${ns.ghostWings && ns.ghostWings.enabled ? "armed" : "disabled"}`, 52)}│`);
    const constellationLabel = entryCount === "lancedb"
      ? `Constellation  :: lancedb (indexed)`
      : `Constellation  :: ${entryCount} embedding(s)${manifest && manifest.dimensions ? ` (${manifest.dimensions}D)` : ""}${constellationProvider !== "json" ? ` [${constellationProvider}]` : ""}`;
    console.log(`│    Phase IV        ${pad(constellationLabel, 52)}│`);
  } else {
    console.log(`│    Status          ${pad("OFFLINE", 52)}│`);
  }

  console.log(`│                                                                             │`);
  console.log(`│  SESSIONS                                                                   │`);
  console.log(`│    Total           ${pad(String(sessionCount), 52)}│`);

  if (lastSession) {
    console.log(`│    Last Active     ${pad(lastSession.lastActiveAt || lastSession.createdAt || "—", 52)}│`);
    console.log(`│    Messages        ${pad(String(lastSession.messageCount), 52)}│`);
  }

  console.log(`│                                                                             │`);
  console.log(`└─────────────────────────────────────────────────────────────────────────────┘`);
  console.log();

  return 0;
}

// ─── Resume ────────────────────────────────────────────────────────────

function loadAllSessions(sessionsDir) {
  if (!fs.existsSync(sessionsDir)) return [];
  return fs
    .readdirSync(sessionsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJsonSafe(path.join(sessionsDir, f));
      if (!data) return null;
      return {
        file: f,
        id: data.id || f.replace(".json", ""),
        createdAt: data.createdAt || null,
        lastActiveAt: data.lastActiveAt || null,
        messages: Array.isArray(data.messages) ? data.messages : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a.lastActiveAt || a.createdAt || "";
      const tb = b.lastActiveAt || b.createdAt || "";
      return tb.localeCompare(ta);
    });
}

function detectGitState(targetRoot) {
  try {
    // Current branch
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: targetRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    // Uncommitted changes count
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: targetRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const changedFiles = status ? status.split("\n").length : 0;

    // Mesh branches with recent activity
    let meshBranches = [];
    try {
      const branchOutput = execFileSync(
        "git",
        ["branch", "--list", "mesh/*", "--format=%(refname:short) %(committerdate:iso)"],
        { cwd: targetRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
      ).trim();
      if (branchOutput) {
        meshBranches = branchOutput.split("\n").map((line) => {
          const parts = line.trim().split(" ");
          return { name: parts[0], date: parts.slice(1).join(" ") };
        });
      }
    } catch {
      // git branch --list may fail if no mesh branches
    }

    return { branch, changedFiles, meshBranches };
  } catch {
    return null;
  }
}

function summarizeMessages(messages, maxCount) {
  const relevant = messages
    .filter((m) => m.role === "agent" || (m.role === "system" && m.content && !m.content.startsWith("📌")))
    .slice(-maxCount);

  return relevant.map((m) => {
    const prefix = m.role === "agent" ? `[${m.agentName || "agent"}]` : "[system]";
    const text = m.content.length > 200 ? m.content.slice(0, 200) + "…" : m.content;
    // Collapse to single line
    return `${prefix} ${text.replace(/\n+/g, " ")}`;
  });
}

function runResume(targetRoot, args) {
  const meshDir = path.join(targetRoot, ".mesh");
  const sessionsDir = path.join(meshDir, "sessions");

  heading(`Mercury Mesh v${VERSION} — Resume`);
  log(`target: ${targetRoot}\n`);

  // ── 1. Find session ───────────────────────────────────────────────
  const sessions = loadAllSessions(sessionsDir);

  // Parse --session flag
  let sessionId = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) {
      sessionId = args[i + 1];
      i++;
    }
  }

  let session = null;
  if (sessionId) {
    session = sessions.find((s) => s.id === sessionId || s.file.includes(sessionId));
    if (!session) {
      log(`Session "${sessionId}" not found.\n`);
      if (sessions.length > 0) {
        log("Available sessions:");
        for (const s of sessions.slice(0, 5)) {
          log(`  ${s.id.slice(0, 12)}…  ${s.lastActiveAt || s.createdAt || "unknown"}  (${s.messages.length} messages)`);
        }
      }
      return 1;
    }
  } else {
    session = sessions[0] || null;
  }

  if (!session) {
    log("No sessions found in .mesh/sessions/.\n");
    log("Start a Mercury Mesh session first, then use resume to recover.\n");
    return 1;
  }

  // ── 2. Session briefing ───────────────────────────────────────────
  log("SESSION\n");
  log(`  ID           ${session.id}`);
  log(`  Started      ${session.createdAt || "unknown"}`);
  log(`  Last active  ${session.lastActiveAt || "unknown"}`);
  log(`  Messages     ${session.messages.length}`);

  const elapsed = session.lastActiveAt
    ? timeSince(session.lastActiveAt)
    : null;
  if (elapsed) {
    log(`  Elapsed      ${elapsed} ago`);
  }

  // ── 3. Last conversation context ──────────────────────────────────
  log("\nLAST ACTIVITY\n");

  const summary = summarizeMessages(session.messages, 4);
  if (summary.length > 0) {
    for (const line of summary) {
      log(`  ${line}`);
    }
  } else {
    log("  (no agent messages recorded)");
  }

  // ── 4. Pending work ───────────────────────────────────────────────
  log("\nPENDING WORK\n");

  const inboxCount = countDirEntries(path.join(meshDir, "decisions", "inbox"));
  log(`  Decision inbox    ${inboxCount > 0 ? `${inboxCount} pending` : "clear"}`);

  // Orchestration logs since session
  const orchDir = path.join(meshDir, "orchestration-log");
  const orchCount = countDirEntries(orchDir);
  log(`  Orchestration log ${orchCount > 0 ? `${orchCount} entries` : "empty"}`);

  // Active claims in org departments
  const structurePath = path.join(meshDir, "org", "structure.json");
  const structure = readJsonSafe(structurePath);
  let activeClaims = 0;
  if (structure && Array.isArray(structure.departments)) {
    for (const dept of structure.departments) {
      const statePath = path.join(meshDir, "org", dept.id, "state.json");
      const state = readJsonSafe(statePath);
      if (state && Array.isArray(state.activeClaims)) {
        activeClaims += state.activeClaims.length;
      }
    }
  }
  if (activeClaims > 0) {
    log(`  Active claims     ${activeClaims} in-flight`);
  }

  // ── 5. Git state ──────────────────────────────────────────────────
  log("\nGIT STATE\n");

  const git = detectGitState(targetRoot);
  if (git) {
    log(`  Branch            ${git.branch}`);
    log(`  Uncommitted       ${git.changedFiles > 0 ? `${git.changedFiles} file(s)` : "clean"}`);
    if (git.meshBranches.length > 0) {
      log(`  Mesh branches     ${git.meshBranches.length}`);
      for (const b of git.meshBranches.slice(0, 5)) {
        log(`    ${b.name}  ${b.date}`);
      }
    }
  } else {
    log("  (not a git repository or git not available)");
  }

  // ── 6. Recovery prompt ────────────────────────────────────────────
  const hasWork = inboxCount > 0 || activeClaims > 0 || (git && git.changedFiles > 0);

  log("\nRECOVERY BRIEFING\n");

  if (hasWork) {
    log("  Unfinished work detected. Paste this into your next Copilot session:\n");

    const lastAgentMsg = session.messages
      .filter((m) => m.role === "agent")
      .pop();
    const lastContext = lastAgentMsg
      ? lastAgentMsg.content.slice(0, 300).replace(/\n+/g, " ")
      : "no prior context available";

    console.log("  ┌──────────────────────────────────────────────────────────┐");
    console.log("  │  Resume interrupted session.                             │");
    console.log(`  │  Last active: ${pad(session.lastActiveAt || "unknown", 43)}│`);
    if (inboxCount > 0) {
      console.log(`  │  Pending decisions: ${pad(String(inboxCount), 37)}│`);
    }
    if (git && git.changedFiles > 0) {
      console.log(`  │  Uncommitted files: ${pad(String(git.changedFiles), 37)}│`);
    }
    console.log(`  │  Context: ${pad(lastContext.slice(0, 47), 47)}│`);
    console.log("  └──────────────────────────────────────────────────────────┘");
  } else {
    log("  No unfinished work detected. Start a fresh sortie.\n");
  }

  log("");
  return 0;
}

function timeSince(isoString) {
  const then = new Date(isoString);
  if (Number.isNaN(then.valueOf())) return null;
  const diffMs = Date.now() - then.valueOf();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function pad(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

// ─── Worktree ──────────────────────────────────────────────────────────

function runWorktree(targetRoot, wtArgs) {
  const meshDir = path.join(targetRoot, ".mesh");
  const sub = wtArgs[0] || "list";

  heading(`Mercury Mesh v${VERSION} — Worktree`);
  log(`target: ${targetRoot}\n`);

  // Locate repo root
  let repoRoot;
  try {
    repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: targetRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    log("Not a git repository. Worktree management requires git.\n");
    return 1;
  }

  let wm;
  try {
    wm = require(path.join(PACKAGE_ROOT, ".mesh", "nervous-system", "worktree-manager.js"));
  } catch {
    log("Worktree manager not found. Run 'mercury-mesh init' first.\n");
    return 1;
  }

  if (sub === "list") {
    const worktrees = wm.listWorktrees(repoRoot);
    const meshWts = wm.listMeshWorktrees(repoRoot);

    log(`Git worktrees: ${worktrees.length} total, ${meshWts.length} mesh-managed\n`);

    if (worktrees.length === 0) {
      log("  (no worktrees found)");
    } else {
      log("  BRANCH                              PATH");
      log("  " + "\u2500".repeat(70));
      for (const wt of worktrees) {
        const branch = wt.branch || "(detached)";
        const isMesh = branch.startsWith("mesh/") ? " [mesh]" : "";
        log(`  ${pad(branch + isMesh, 38)}${wt.path}`);
      }
    }

    log("");
    return 0;
  }

  if (sub === "status") {
    if (!fs.existsSync(meshDir)) {
      log("No .mesh/ directory found.\n");
      return 1;
    }

    const { orphanedWorktrees, staleGhosts, healthy } = wm.reconcileWorktrees(repoRoot, meshDir);

    log("WORKTREE HEALTH\n");
    log(`  Healthy            ${healthy.length}`);
    log(`  Orphaned worktrees ${orphanedWorktrees.length}`);
    log(`  Stale ghosts       ${staleGhosts.length}`);

    if (orphanedWorktrees.length > 0) {
      log("\n  ORPHANED WORKTREES (no matching Ghost Wing):");
      for (const wt of orphanedWorktrees) {
        log(`    ${wt.branch || "(detached)"}  \u2192  ${wt.path}`);
      }
    }

    if (staleGhosts.length > 0) {
      log("\n  STALE GHOSTS (worktree missing):");
      for (const ghost of staleGhosts) {
        log(`    ${ghost.id}  ${ghost.name || ""}`);
      }
    }

    if (orphanedWorktrees.length === 0 && staleGhosts.length === 0) {
      log("\n  All worktrees and Ghost Wings are in sync.");
    }

    log("");
    return 0;
  }

  if (sub === "prune") {
    if (!fs.existsSync(meshDir)) {
      log("No .mesh/ directory found.\n");
      return 1;
    }

    const { orphanedWorktrees } = wm.reconcileWorktrees(repoRoot, meshDir);

    if (orphanedWorktrees.length === 0) {
      log("No orphaned mesh worktrees to prune.\n");
      return 0;
    }

    log(`Pruning ${orphanedWorktrees.length} orphaned worktree(s):\n`);

    let pruned = 0;
    for (const wt of orphanedWorktrees) {
      const result = wm.removeWorktree({
        repoRoot,
        worktreePath: wt.path,
        deleteBranch: true,
        branchName: wt.branch,
      });
      if (result.success) {
        log(`  remove  ${wt.branch || "(detached)"}  \u2192  ${wt.path}`);
        pruned++;
      } else {
        log(`  FAIL    ${wt.branch || "(detached)"}  \u2192  ${result.error || "unknown error"}`);
      }
    }

    log(`\nPruned ${pruned}/${orphanedWorktrees.length} worktree(s).\n`);
    return 0;
  }

  log(`Unknown subcommand: ${sub}`);
  log("Available: list, status, prune\n");
  return 1;
}

// ─── Coalescence ───────────────────────────────────────────────────────

function runCoalescence(targetRoot, cArgs) {
  const meshDir = path.join(targetRoot, ".mesh");
  const sub = cArgs[0] || "scan";

  heading(`Mercury Mesh v${VERSION} — Coalescence`);
  log(`target: ${targetRoot}\n`);

  if (!fs.existsSync(meshDir)) {
    log("No .mesh/ directory found. Run 'mercury-mesh init' first.\n");
    return 1;
  }

  let gc;
  try {
    gc = require(path.join(
      path.resolve(__dirname, ".."),
      ".mesh",
      "nervous-system",
      "ghost-coalescence.js"
    ));
  } catch {
    log("Coalescence module not found.\n");
    return 1;
  }

  if (sub === "scan") {
    const report = gc.reconcile(meshDir, { apply: false });

    log(`GHOST WING OVERLAP SCAN\n`);
    log(`  Active ghosts     ${report.ghostCount}`);
    log(`  Overlaps found    ${report.overlapCount}`);
    log(`  Auto-coalescible  ${report.autoCoalesce}`);
    log(`  Flagged for review ${report.flagForReview}`);

    if (report.overlaps.length > 0) {
      log("\n  OVERLAPPING PAIRS:");
      log("  " + "\u2500".repeat(70));
      for (const o of report.overlaps) {
        const risk = o.score >= gc.COALESCENCE_AUTO_THRESHOLD ? "HIGH" : "MODERATE";
        log(`  [${risk}] ${pad(o.wingAName || o.wingA, 20)} \u2194 ${pad(o.wingBName || o.wingB, 20)}  score: ${o.score}`);
        log(`         domain: ${o.signals.domain}  keywords: ${o.signals.keywords}  files: ${o.signals.files}  attractors: ${o.signals.attractors}`);
      }
    }

    if (report.ghostCount < 2) {
      log("\n  Need at least 2 active Ghost Wings for overlap detection.");
    } else if (report.overlapCount === 0) {
      log("\n  All Ghost Wings have distinct scopes. No coalescence needed.");
    }

    log("");
    return 0;
  }

  if (sub === "apply") {
    const report = gc.reconcile(meshDir, { apply: true });

    log(`COALESCENCE APPLIED\n`);
    log(`  Coalesced pairs   ${report.coalesced.length}`);

    if (report.coalesced.length > 0) {
      for (const c of report.coalesced) {
        log(`  merge  ${c.absorbedId} \u2192 ${c.survivorId}  (score: ${c.score})`);
      }
    } else {
      log("  No pairs exceeded the auto-coalescence threshold.");
    }

    if (report.flagForReview > 0) {
      log(`\n  ${report.flagForReview} pair(s) flagged for Commander review (moderate overlap).`);
    }

    log("");
    return 0;
  }

  log(`Unknown subcommand: ${sub}`);
  log("Available: scan, apply\n");
  return 1;
}

// ─── Peers ─────────────────────────────────────────────────────────────

function runPeers(targetRoot, pArgs) {
  const meshDir = path.join(targetRoot, ".mesh");
  const sub = pArgs[0] || "list";

  heading(`Mercury Mesh v${VERSION} — Peers`);
  log(`target: ${targetRoot}\n`);

  if (!fs.existsSync(meshDir)) {
    log("No .mesh/ directory found. Run 'mercury-mesh init' first.\n");
    return 1;
  }

  let mp;
  try {
    mp = require(path.join(
      path.resolve(__dirname, ".."),
      ".mesh",
      "nervous-system",
      "mesh-peer.js"
    ));
  } catch {
    log("Peer module not found.\n");
    return 1;
  }

  if (sub === "list") {
    const { peers, healthy, stale, halted, localId } = mp.classifyPeers(meshDir);

    log(`PEER REGISTRY\n`);
    log(`  Total peers   ${peers.length}`);
    log(`  Healthy       ${healthy.length}`);
    log(`  Stale         ${stale.length}`);
    log(`  Halted        ${halted.length}`);
    log(`  Local node    ${localId}`);

    if (peers.length > 0) {
      log("\n  NODE ID       ALIAS                STATUS     LAST HEARTBEAT");
      log("  " + "\u2500".repeat(70));
      for (const p of peers) {
        const status = p.halted
          ? "HALTED"
          : p._staleMinutes
            ? `STALE (${p._staleMinutes}m)`
            : "HEALTHY";
        const local = p._isLocal ? " (local)" : "";
        log(`  ${pad(p.nodeId, 14)}${pad(p.alias + local, 21)}${pad(status, 17)}${p.lastHeartbeat}`);
      }
    } else {
      log("\n  No peers registered. Run 'mercury-mesh peers register' to add this node.");
    }

    log("");
    return 0;
  }

  if (sub === "register") {
    const aliasIdx = pArgs.indexOf("--alias");
    const alias = aliasIdx !== -1 && pArgs[aliasIdx + 1] ? pArgs[aliasIdx + 1] : undefined;

    const manifest = mp.registerSelf(meshDir, { alias });

    log(`REGISTERED\n`);
    log(`  Node ID       ${manifest.nodeId}`);
    log(`  Alias         ${manifest.alias}`);
    log(`  Hostname      ${manifest.hostname}`);
    log(`  Platform      ${manifest.platform}/${manifest.arch}`);
    log(`  Mesh version  ${manifest.meshVersion}`);
    log(`  Capabilities  ${manifest.capabilities.join(", ") || "(none)"}`);
    log(`  Departments   ${manifest.departmentCount} (${manifest.ghostCount} ghosts)`);

    log("");
    return 0;
  }

  if (sub === "sync") {
    const report = mp.syncWithPeers(meshDir);

    log(`SYNC COMPLETE\n`);
    log(`  Local node          ${report.localNodeId}`);
    log(`  Peers scanned       ${report.peersScanned}`);
    log(`  Delta exported      ${report.localDeltaExported} entries`);
    log(`  Imported            ${report.constellationImported} entries`);
    log(`  Skipped (dup)       ${report.constellationSkipped} entries`);

    if (report.peerResults.length > 0) {
      log("\n  PEER SYNC DETAILS:");
      for (const pr of report.peerResults) {
        log(`    ${pad(pr.sourceNodeId || "unknown", 14)} +${pr.imported} imported, ${pr.skipped} skipped`);
      }
    }

    log("");
    return 0;
  }

  if (sub === "health") {
    const { peers, healthy, stale, halted, localId } = mp.classifyPeers(meshDir);

    log(`FLEET HEALTH\n`);
    log(`  Total nodes   ${peers.length}`);
    log(`  Healthy       ${healthy.length}`);
    log(`  Stale         ${stale.length}`);
    log(`  Halted        ${halted.length}`);

    const fleetHealth = peers.length > 0
      ? Math.round((healthy.length / peers.length) * 100)
      : 100;

    log(`\n  Fleet health  ${fleetHealth}%`);

    if (stale.length > 0) {
      log("\n  STALE NODES (no heartbeat within TTL):");
      for (const p of stale) {
        log(`    ${p.nodeId}  ${p.alias}  last seen ${p._staleMinutes}m ago`);
      }
    }

    if (halted.length > 0) {
      log("\n  HALTED NODES:");
      for (const p of halted) {
        log(`    ${p.nodeId}  ${p.alias}`);
      }
    }

    if (peers.length === 0) {
      log("\n  No peers registered. Fleet health is nominal (single-node).");
    }

    log("");
    return 0;
  }

  if (sub === "prune") {
    const { pruned, removed } = mp.pruneStalePeers(meshDir);

    log(`PRUNE COMPLETE\n`);
    log(`  Removed ${pruned} stale peer(s)`);

    if (removed.length > 0) {
      for (const id of removed) {
        log(`    remove  ${id}`);
      }
    } else {
      log("  No stale peers to prune.");
    }

    log("");
    return 0;
  }

  log(`Unknown subcommand: ${sub}`);
  log("Available: list, register, sync, health, prune\n");
  return 1;
}

// ─── Create Skill ──────────────────────────────────────────────────────

// Workflow files scaffolded by init (used by eject to identify mesh workflows)
const MESH_WORKFLOW_FILES = [
  "mesh-ci.yml",
  "mesh-docs.yml",
  "mesh-heartbeat.yml",
  "mesh-insider-release.yml",
  "mesh-issue-assign.yml",
  "mesh-label-enforce.yml",
  "mesh-preview.yml",
  "mesh-promote.yml",
  "mesh-release.yml",
  "mesh-triage.yml",
  "sync-mesh-labels.yml",
];

// ─── Eject ─────────────────────────────────────────────────────────────

function runEject(targetRoot) {
  heading(`Mercury Mesh v${VERSION} — Eject`);
  log(`target: ${targetRoot}\n`);

  const meshDir = path.join(targetRoot, ".mesh");

  if (!fs.existsSync(meshDir)) {
    log("No .mesh/ directory found. Nothing to eject.\n");
    return 1;
  }

  let removedCount = 0;
  let skippedCount = 0;

  function rm(filePath, label) {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      log(`remove  ${label}`);
      removedCount++;
    }
  }

  // ── 1. Remove .mesh/ directory ────────────────────────────────────
  log("MESH RUNTIME\n");
  rm(meshDir, ".mesh/");

  // ── 2. Remove mesh agent ──────────────────────────────────────────
  log("\nAGENT & INSTRUCTIONS\n");
  rm(path.join(targetRoot, ".github", "agents", "mercury-mesh.agent.md"), ".github/agents/mercury-mesh.agent.md");
  rm(path.join(targetRoot, ".github", "copilot-instructions.md"), ".github/copilot-instructions.md");

  // Clean up empty .github/agents/ dir
  const agentsDir = path.join(targetRoot, ".github", "agents");
  if (fs.existsSync(agentsDir)) {
    const remaining = fs.readdirSync(agentsDir);
    if (remaining.length === 0) {
      fs.rmdirSync(agentsDir);
      log("remove  .github/agents/  (empty)");
    }
  }

  // ── 3. Remove mesh skills ────────────────────────────────────────
  log("\nSKILLS\n");
  rm(path.join(targetRoot, ".copilot", "skills"), ".copilot/skills/");

  // Keep .copilot/mcp-config.json if it exists (user may have customized)
  const mcpConfig = path.join(targetRoot, ".copilot", "mcp-config.json");
  if (fs.existsSync(mcpConfig)) {
    log("keep    .copilot/mcp-config.json  (may contain user config)");
    skippedCount++;
  }

  // Clean up empty .copilot/ dir
  const copilotDir = path.join(targetRoot, ".copilot");
  if (fs.existsSync(copilotDir)) {
    const remaining = fs.readdirSync(copilotDir);
    if (remaining.length === 0) {
      fs.rmdirSync(copilotDir);
      log("remove  .copilot/  (empty)");
    }
  }

  // ── 4. Remove mesh workflows ─────────────────────────────────────
  log("\nWORKFLOWS\n");
  const workflowsDir = path.join(targetRoot, ".github", "workflows");
  if (fs.existsSync(workflowsDir)) {
    for (const wf of MESH_WORKFLOW_FILES) {
      rm(path.join(workflowsDir, wf), `.github/workflows/${wf}`);
    }

    // Clean up empty workflows/ dir
    const remaining = fs.readdirSync(workflowsDir);
    if (remaining.length === 0) {
      fs.rmdirSync(workflowsDir);
      log("remove  .github/workflows/  (empty)");
    }
  } else {
    log("(no workflows directory)");
  }

  // ── 5. Clean .gitignore ──────────────────────────────────────────
  log("\nGITIGNORE\n");
  const gitignorePath = path.join(targetRoot, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const meshPatterns = new Set(GITIGNORE_LINES);
    const lines = content.split("\n");
    const cleaned = lines.filter((line) => !meshPatterns.has(line));

    // Remove trailing blank lines left behind
    while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === "" && cleaned.length > 1) {
      cleaned.pop();
    }

    if (cleaned.length < lines.length) {
      fs.writeFileSync(gitignorePath, cleaned.join("\n"));
      log(`patch   .gitignore  (removed ${lines.length - cleaned.length} mesh lines)`);
    } else {
      log("skip    .gitignore  (no mesh entries found)");
    }
  } else {
    log("(no .gitignore)");
  }

  // ── Summary ───────────────────────────────────────────────────────
  log("");
  log(`Ejected. ${removedCount} item(s) removed, ${skippedCount} preserved.`);
  log("Mercury Mesh has been cleanly removed from this project.\n");

  return 0;
}

// ─── Create Skill ──────────────────────────────────────────────────────

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SKILL_TEMPLATE = (name, description, domain) => `---
name: "${name}"
description: "${description}"
domain: "${domain}"
confidence: "low"
source: "manual"
---

## Context

<!-- Describe when and why this skill applies. -->

## Patterns

<!-- Document the patterns this skill encodes. -->

## Examples

<!-- Add concrete examples of correct application. -->

## Anti-Patterns

<!-- Document what NOT to do. -->
`;

function runCreateSkill(targetRoot, args) {
  const nameArg = args.find((a) => !a.startsWith("-"));
  if (!nameArg) {
    console.error("Usage: npx mercury-mesh create-skill <name> [--description <desc>] [--domain <domain>]");
    return 1;
  }

  const slug = slugify(nameArg);
  if (!slug) {
    console.error("Invalid skill name — must contain at least one alphanumeric character.");
    return 1;
  }

  // Parse optional flags
  let description = "";
  let domain = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--description" && args[i + 1]) {
      description = args[i + 1];
      i++;
    }
    if (args[i] === "--domain" && args[i + 1]) {
      domain = args[i + 1];
      i++;
    }
  }

  const liveDir = path.join(targetRoot, ".copilot", "skills", slug);
  const templateDir = path.join(targetRoot, ".mesh", "templates", "skills", slug);

  // Check for collisions
  if (fs.existsSync(liveDir)) {
    console.error(`Skill already exists: .copilot/skills/${slug}/`);
    return 1;
  }

  heading(`Mercury Mesh v${VERSION} — Create Skill`);

  const content = SKILL_TEMPLATE(slug, description, domain);

  // Write to live skills
  ensureDir(liveDir);
  fs.writeFileSync(path.join(liveDir, "SKILL.md"), content, "utf-8");
  log(`write .copilot/skills/${slug}/SKILL.md`);

  // Mirror to template seeds (keep in sync)
  if (fs.existsSync(path.join(targetRoot, ".mesh", "templates", "skills"))) {
    ensureDir(templateDir);
    fs.writeFileSync(path.join(templateDir, "SKILL.md"), content, "utf-8");
    log(`write .mesh/templates/skills/${slug}/SKILL.md`);
    log("Live and template skills are in sync.");
  } else {
    log("skip  .mesh/templates/skills/ (directory not found — template sync skipped)");
  }

  log(`\nSkill "${slug}" created. Edit .copilot/skills/${slug}/SKILL.md to fill in patterns.\n`);
  return 0;
}

function printUsage() {
  console.log(`
Mercury Mesh v${VERSION} — CLI

Usage:
  npx @mizyoel/mercury-mesh init    [--force] [--target <path>]
  npx @mizyoel/mercury-mesh update  [--target <path>]
  npx @mizyoel/mercury-mesh doctor  [--target <path>]
  npx @mizyoel/mercury-mesh status  [--target <path>]
  npx @mizyoel/mercury-mesh create-skill <name> [--description <desc>] [--domain <domain>]
  npx @mizyoel/mercury-mesh resume  [--session <id>] [--target <path>]
  npx @mizyoel/mercury-mesh eject   [--target <path>]
  npx @mizyoel/mercury-mesh worktree [list|status|prune] [--target <path>]
  npx @mizyoel/mercury-mesh coalescence [scan|apply] [--target <path>]
  npx @mizyoel/mercury-mesh peers [list|register|sync|health|prune] [--target <path>]
  npx @mizyoel/mercury-mesh github-mcp
  npx @mizyoel/mercury-mesh version

Commands:
  init     Scaffold Copilot agent, skills, workflows, and .mesh/ runtime
           into the target project. Existing files are preserved unless --force.
  update   Overwrite agent prompt, skills, and copilot-instructions with the
           latest from this package version. Config and team files are untouched.
  doctor   Run hull diagnostics: validate config, structure, skills, nervous
           system, secrets, and version alignment. Paste output for bug reports.
  status   Bridge telemetry: crew roster, org health, nervous system, sessions,
           and pending decisions at a glance.
  create-skill
           Scaffold a new skill in .copilot/skills/ and .mesh/templates/skills/.
           Creates SKILL.md with frontmatter and section stubs.
  resume   Recover from an interrupted sortie: show last session context,
           pending decisions, uncommitted work, and a recovery briefing.
  eject    Remove Mercury Mesh from the project. Strips .mesh/, agent prompt,
           skills, workflows, and .gitignore entries. Keeps mcp-config.json.
  worktree List, inspect, and prune git worktrees for parallel Wing execution.
           Subcommands: list (all worktrees), status (health), prune (cleanup).
  coalescence
           Detect overlapping Ghost Wings and auto-merge compatible pairs.
           Subcommands: scan (report only), apply (merge high-confidence overlaps).
  peers    Multi-machine coordination: register nodes, sync constellation,
           and monitor fleet health. Subcommands: list, register, sync, health, prune.
  github-mcp  Start the GitHub MCP server using gh auth token for local auth.
  version  Print package version.

Options:
  --force            Overwrite existing files during init
  --target <path>    Target project root (default: current working directory)
  --session <id>     Target a specific session for resume (default: most recent)
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
    case "doctor":
      process.exit(runDoctor(targetRoot));
      break;
    case "status":
      process.exit(runStatus(targetRoot));
      break;
    case "create-skill": {
      // Collect args after "create-skill", excluding --target and its value
      const skillArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "create-skill") continue;
        if (args[i] === "--target") { i++; continue; }
        skillArgs.push(args[i]);
      }
      process.exit(runCreateSkill(targetRoot, skillArgs));
      break;
    }
    case "resume": {
      const resumeArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "resume") continue;
        if (args[i] === "--target") { i++; continue; }
        resumeArgs.push(args[i]);
      }
      process.exit(runResume(targetRoot, resumeArgs));
      break;
    }
    case "eject":
      process.exit(runEject(targetRoot));
      break;
    case "worktree": {
      const wtArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "worktree") continue;
        if (args[i] === "--target") { i++; continue; }
        wtArgs.push(args[i]);
      }
      process.exit(runWorktree(targetRoot, wtArgs));
      break;
    }
    case "coalescence": {
      const cArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "coalescence") continue;
        if (args[i] === "--target") { i++; continue; }
        cArgs.push(args[i]);
      }
      process.exit(runCoalescence(targetRoot, cArgs));
      break;
    }
    case "peers": {
      const pArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "peers") continue;
        if (args[i] === "--target") { i++; continue; }
        pArgs.push(args[i]);
      }
      process.exit(runPeers(targetRoot, pArgs));
      break;
    }
    case "version":
      console.log(VERSION);
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main();
