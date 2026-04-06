#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = require(path.join(PACKAGE_ROOT, "package.json"));
const PACKAGE_NAME = PACKAGE_JSON.name;
const VERSION = PACKAGE_JSON.version;

const { detectRepoComplexity } = require(path.join(PACKAGE_ROOT, "lib", "complexity-scanner.cjs"));
const { resolveRecommendedProfile, buildConfig, formatRecommendationSummary } = require(path.join(PACKAGE_ROOT, "lib", "profile-resolver.cjs"));

const UPDATE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const UPDATE_CHECK_TIMEOUT_MS = 1200;

// ─── Terminal styling ──────────────────────────────────────────────────
// Zero-dependency ANSI color system. Degrades to plain text in pipes / NO_COLOR.

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const esc = (code, s) => isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;

const style = {
  bold:    (s) => esc("1", s),
  dim:     (s) => esc("2", s),
  cyan:    (s) => esc("36", s),
  green:   (s) => esc("32", s),
  red:     (s) => esc("31", s),
  yellow:  (s) => esc("33", s),
  magenta: (s) => esc("35", s),

  // composites
  boldCyan:   (s) => esc("1;36", s),
  boldGreen:  (s) => esc("1;32", s),
  boldRed:    (s) => esc("1;31", s),
  boldYellow: (s) => esc("1;33", s),
  dimCyan:    (s) => esc("2;36", s),
};

// Gradient across a string using 256-color ANSI (blue→cyan: 33→51)
function gradient(text, from = 33, to = 51) {
  if (!isTTY) return text;
  return [...text].map((ch, i) => {
    if (ch === " ") return ch;
    const code = Math.round(from + (to - from) * (i / Math.max(text.length - 1, 1)));
    return `\x1b[38;5;${code}m${ch}`;
  }).join("") + "\x1b[0m";
}

// Strip ANSI escape codes for width calculation
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// Spinner for async-feeling operations (call stop() when done)
function createSpinner(msg) {
  if (!isTTY) {
    // Pipe mode: just print the message, return a no-op stop
    return {
      stop(symbol, color) {
        const prefix = symbol === "✓" ? "✓" : symbol === "✗" ? "✗" : symbol || "→";
        console.log(`  ${prefix}  ${msg}`);
      },
    };
  }
  const frames = ["◜", "◠", "◝", "◞", "◡", "◟"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${style.cyan(frames[i++ % frames.length])} ${msg}  `);
  }, 80);
  return {
    stop(symbol = "✓", colorFn = style.green) {
      clearInterval(id);
      process.stdout.write(`\r  ${colorFn(symbol)} ${msg}  \n`);
    },
  };
}

// ─── Interactive prompts ───────────────────────────────────────────────

const readline = require("node:readline");

function confirm(question, defaultYes = false) {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(defaultYes);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${style.cyan("?")} ${question} ${style.dim(hint)} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "") return resolve(defaultYes);
      resolve(a === "y" || a === "yes");
    });
  });
}

function choice(question, options) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(options[0].value);
    console.log(`\n  ${style.cyan("?")} ${question}\n`);
    for (let i = 0; i < options.length; i++) {
      const marker = style.cyan(`[${i + 1}]`);
      console.log(`    ${marker} ${options[i].label}`);
    }
    console.log("");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${style.dim("Choice:")} `, (answer) => {
      rl.close();
      const idx = parseInt(answer.trim(), 10) - 1;
      if (idx >= 0 && idx < options.length) return resolve(options[idx].value);
      resolve(options[0].value);
    });
  });
}

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
  const cols = Math.min(process.stdout.columns || 60, 80);
  const rule = style.dimCyan("─".repeat(cols));
  console.log(`\n${rule}`);
  console.log(`  ${gradient(msg)}`);
  console.log(`${rule}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveUpdateCheckCachePath() {
  if (process.env.MERCURY_MESH_UPDATE_CHECK_CACHE_PATH) {
    return path.resolve(process.env.MERCURY_MESH_UPDATE_CHECK_CACHE_PATH);
  }
  return path.join(os.homedir(), ".mercury-mesh", "update-check.json");
}

function readUpdateCheckCache(cachePath) {
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeUpdateCheckCache(cachePath, latestVersion) {
  try {
    ensureDir(path.dirname(cachePath));
    fs.writeFileSync(cachePath, JSON.stringify({ checkedAt: Date.now(), latestVersion }) + "\n", "utf-8");
  } catch {
    // Cache writes should never affect CLI execution.
  }
}

function normalizeVersion(version) {
  const match = String(version || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function isVersionNewer(candidate, current) {
  const next = normalizeVersion(candidate);
  const existing = normalizeVersion(current);

  if (!next || !existing) return false;

  for (let i = 0; i < 3; i++) {
    if (next[i] > existing[i]) return true;
    if (next[i] < existing[i]) return false;
  }

  return false;
}

function fetchLatestPublishedVersion() {
  if (process.env.MERCURY_MESH_UPDATE_CHECK_LATEST_VERSION) {
    return process.env.MERCURY_MESH_UPDATE_CHECK_LATEST_VERSION;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  try {
    const stdout = execFileSync(
      npmCommand,
      ["view", PACKAGE_NAME, "version", "--json"],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: UPDATE_CHECK_TIMEOUT_MS,
        windowsHide: true,
      }
    ).trim();

    if (!stdout) return null;

    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function notifyIfUpdateAvailable(command) {
  if (!command || command === "version" || command === "--help" || command === "help") {
    return;
  }

  if (process.env.MERCURY_MESH_DISABLE_UPDATE_CHECK === "1") {
    return;
  }

  const forceCheck = process.env.MERCURY_MESH_UPDATE_CHECK_FORCE === "1";
  const cachePath = resolveUpdateCheckCachePath();

  if (!forceCheck && !process.env.MERCURY_MESH_UPDATE_CHECK_LATEST_VERSION) {
    const cached = readUpdateCheckCache(cachePath);
    if (cached && typeof cached.checkedAt === "number") {
      const freshEnough = (Date.now() - cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS;
      if (freshEnough) {
        if (isVersionNewer(cached.latestVersion, VERSION)) {
          log(`${style.boldYellow("update available")}  ${style.dim(`v${VERSION}`)} ${style.dim("→")} ${style.bold(`v${cached.latestVersion}`)}`);
          log(`${style.dim("run")} ${style.cyan(`npm install -g ${PACKAGE_NAME}@latest`)} ${style.dim("or")} ${style.cyan(`npx ${PACKAGE_NAME}@latest <command>`)}\n`);
        }
        return;
      }
    }
  }

  const latestVersion = fetchLatestPublishedVersion();
  writeUpdateCheckCache(cachePath, latestVersion);

  if (isVersionNewer(latestVersion, VERSION)) {
    log(`${style.boldYellow("update available")}  ${style.dim(`v${VERSION}`)} ${style.dim("→")} ${style.bold(`v${latestVersion}`)}`);
    log(`${style.dim("run")} ${style.cyan(`npm install -g ${PACKAGE_NAME}@latest`)} ${style.dim("or")} ${style.cyan(`npx ${PACKAGE_NAME}@latest <command>`)}\n`);
  }
}

function copyFileIfMissing(src, dest, { force = false } = {}) {
  if (fs.existsSync(dest) && !force) {
    log(`${style.dim("skip")}  ${style.dim(dest)}  ${style.dim("(already exists)")}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  log(`${style.green("write")} ${style.dim(dest)}`);
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
    log(`${style.dim("skip")}  ${style.dim(".gitignore")}  ${style.dim("(entries already present)")}`);
    return;
  }

  const block = "\n" + GITIGNORE_LINES.join("\n") + "\n";
  fs.writeFileSync(gitignorePath, content.trimEnd() + "\n" + block, "utf-8");
  log(`${style.green("patch")} ${style.dim(".gitignore")}  ${style.dim("(added mesh runtime ignores)")}`);
}

function writeDefaultConfig(targetRoot, { vanguardEnabled = false } = {}) {
  const configPath = path.join(targetRoot, ".mesh", "config.json");
  if (fs.existsSync(configPath)) {
    log(`${style.dim("skip")}  ${style.dim(".mesh/config.json")}  ${style.dim("(already exists)")}`);
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
    vanguard: {
      enabled: vanguardEnabled,
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + "\n", "utf-8");
  log(`${style.green("write")} ${style.dim(".mesh/config.json")}  ${style.dim("(default — nervous system off)")}`);
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
    log(`${style.cyan("stamp")} ${style.dim(".github/agents/mercury-mesh.agent.md")} ${style.cyan("→")} ${style.bold(`v${VERSION}`)}`);
  }
}

// ─── Commands ──────────────────────────────────────────────────────────

async function runInit(targetRoot, flags) {
  heading(`Mercury Mesh v${VERSION} — Init`);
  log(`target: ${targetRoot}\n`);

  let filesWritten = 0;

  for (const entry of SCAFFOLD_MANIFEST) {
    const src = path.join(PACKAGE_ROOT, entry.src);
    const dest = path.join(targetRoot, entry.dest);

    if (!fs.existsSync(src)) {
      log(`${style.yellow("warn")}  ${style.dim(entry.src)}  ${style.yellow("(source missing in package — skipping)")}`);
      continue;
    }

    if (entry.type === "dir") {
      filesWritten += copyDirRecursive(src, dest, { force: flags.force });
    } else {
      if (copyFileIfMissing(src, dest, { force: flags.force })) filesWritten++;
    }
  }

  // ── Adaptive config onboarding ──────────────────────────────────────
  const configPath = path.join(targetRoot, ".mesh", "config.json");
  const configExists = fs.existsSync(configPath);

  if (!configExists) {
    log("");
    const spinner = createSpinner("Scanning hull profile");
    const scanResult = detectRepoComplexity(targetRoot);
    const resolved = resolveRecommendedProfile(scanResult);
    spinner.stop("✓", style.green);

    // Display detected profile
    log("");
    log(`  ${style.boldCyan("HULL PROFILE DETECTED")} ${style.dim("::")} ${style.bold(resolved.label)}`);
    log(`  ${style.dim("CONFIDENCE")}            ${style.dim("::")} ${scanResult.confidence.toUpperCase()}`);
    log("");
    log(`  ${style.bold("RECOMMENDED POSTURE")}`);
    const cfg = resolved.config;
    const on  = (v) => v ? style.green("ENABLE") : style.dim("KEEP OFF");
    const man = (v) => v ? style.yellow("ENABLE") : style.dim("KEEP MANUAL");
    log(`    orgMode               ${on(cfg.orgMode)}`);
    log(`    nervousSystem         ${on(cfg.nervousSystem.enabled)}`);
    log(`    ghostWings            ${on(cfg.ghostWings.enabled)}`);
    log(`    autoMaterialize       ${man(cfg.ghostWings.autoMaterialize)}`);
    log(`    vanguard              ${on(cfg.vanguard.enabled)}`);

    if (scanResult.reasons.length > 0) {
      log("");
      log(`  ${style.dim("SIGNALS")}`);
      for (const reason of scanResult.reasons) {
        log(`    ${style.dim("—")} ${style.dim(reason)}`);
      }
    }

    const initChoice = await choice("How would you like to proceed?", [
      { label: "Accept recommended posture", value: "accept" },
      { label: "Review each high-impact setting", value: "review" },
      { label: "Start conservative (everything off)", value: "conservative" },
    ]);

    let overrides = {};

    if (initChoice === "conservative") {
      overrides = { orgMode: false, nervousSystem: false, vanguard: false, autoMaterialize: false };
    } else if (initChoice === "review") {
      // Walk through high-impact settings
      overrides.orgMode = await confirm(
        "Coordinate work as a structured multi-department formation?",
        cfg.orgMode
      );
      overrides.nervousSystem = await confirm(
        "Enable the Nervous System (semantic routing + adaptive mesh)?",
        cfg.nervousSystem.enabled
      );
      overrides.vanguard = await confirm(
        "Allow the Mesh to propose and stage autonomous innovation experiments?",
        false
      );
      if (overrides.vanguard) {
        overrides.autoMaterialize = await confirm(
          "Auto-form Ghost Wings for unclaimed domains? (requires Commander trust)",
          false
        );
      }
    }
    // "accept" → overrides stays empty, profile defaults apply

    const finalConfig = buildConfig(resolved, overrides);
    ensureDir(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2) + "\n", "utf-8");
    log(`\n  ${style.green("write")} ${style.dim(".mesh/config.json")}  ${style.dim(`(${resolved.profile} profile)`)}`);
  } else {
    log(`  ${style.dim("skip")}  ${style.dim(".mesh/config.json")}  ${style.dim("(already exists)")}`);
  }
  patchGitignore(targetRoot);
  stampVersion(targetRoot);

  heading("Init complete");
  log(`${style.boldGreen(String(filesWritten))} file(s) written.`);
  log(`${style.dim("Existing files were preserved (use --force to overwrite).")}\n`);
  log(style.bold("Next steps:"));
  log(`  ${style.cyan("1.")} Open VS Code in this project`);
  log(`  ${style.cyan("2.")} Add your OpenRouter key to .mesh/local.json if you want semantic routing`);
  log(`  ${style.cyan("3.")} Chat with @mercury-mesh — say ${style.bold('"declare the mission"')}`);
  log(`  ${style.cyan("4.")} The bridge will cast your crew and scaffold team.md\n`);
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
      log(`${style.green("write")} ${style.dim(dest)}`);
      filesWritten++;
    }
  }

  stampVersion(targetRoot);

  // ── Config migration: inject missing top-level keys ─────────────────
  const updateConfigPath = path.join(targetRoot, ".mesh", "config.json");
  if (fs.existsSync(updateConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(updateConfigPath, "utf-8"));
      let migrated = false;
      if (cfg.vanguard === undefined) {
        cfg.vanguard = { enabled: false };
        migrated = true;
      }
      if (migrated) {
        fs.writeFileSync(updateConfigPath, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
        log(`${style.green("migrate")} ${style.dim(".mesh/config.json")}  ${style.dim("(added vanguard defaults)")}`);
        filesWritten++;
      }
    } catch { /* config parse errors are caught by doctor */ }
  }

  heading("Update complete");
  log(`${style.boldGreen(String(filesWritten))} file(s) updated (agent prompt + skills + instructions).\n`);
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
    "vanguard",
  ],
};

function runDoctor(targetRoot) {
  heading(`Mercury Mesh v${VERSION} — Doctor`);
  log(`target: ${targetRoot}\n`);

  const results = { pass: 0, warn: 0, fail: 0 };

  function pass(msg) {
    results.pass++;
    log(`  ${style.green("✓")}  ${msg}`);
  }
  function warn(msg) {
    results.warn++;
    log(`  ${style.yellow("⚠")}  ${style.yellow(msg)}`);
  }
  function fail(msg) {
    results.fail++;
    log(`  ${style.red("✗")}  ${style.red(msg)}`);
  }

  // ── 1. Structure ──────────────────────────────────────────────────
  log(style.bold("Structure") + "\n");

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
  log("\n" + style.bold("Config") + "\n");

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
  log("\n" + style.bold("Agent Prompt") + "\n");

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
  log("\n" + style.bold("Skills") + "\n");

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
  log("\n" + style.bold("Nervous System") + "\n");

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

  // ── 6. Posture Advisory ───────────────────────────────────────────
  log("\n" + style.bold("Posture Advisory") + "\n");

  if (config) {
    try {
      const scanResult = detectRepoComplexity(targetRoot);
      const resolved = resolveRecommendedProfile(scanResult);
      const rec = resolved.config;

      // CFG-101: Repo complexity exceeds conservative bridge posture
      if ((scanResult.profile === "heavy" || scanResult.profile === "medium") && config.orgMode === false) {
        warn(`CFG-101  Repo complexity is ${scanResult.profile} but orgMode is OFF — consider enabling structured coordination`);
      } else {
        pass(`Org posture aligned with ${scanResult.profile} hull profile`);
      }

      // CFG-102: Ghost Wings likely beneficial based on signals
      const nsConfig = config.nervousSystem || {};
      const ghostEnabled = nsConfig.ghostWings ? nsConfig.ghostWings.enabled !== false : false;
      if ((scanResult.profile === "medium" || scanResult.profile === "heavy") && !ghostEnabled && !nsConfig.enabled) {
        warn("CFG-102  Nervous System + Ghost Wings likely beneficial for this hull size — run `mercury-mesh config tune`");
      }

      // CFG-103: Auto-materialization enabled without Tier-1 Commander
      const autoMat = nsConfig.ghostWings && nsConfig.ghostWings.autoMaterialize;
      const hasTier1 = config.humanTiers && config.humanTiers.tier1 && config.humanTiers.tier1.length > 0;
      if (autoMat && !hasTier1) {
        warn("CFG-103  Auto-materialization enabled without a claimed Tier-1 Commander — topology may grow unsupervised");
      }

      // CFG-201: Experimental signals suggest Vanguard evaluation
      if (scanResult.profile === "experimental" && (!config.vanguard || !config.vanguard.enabled)) {
        warn("CFG-201  Experimental repo signals detected — consider evaluating Vanguard (`mercury-mesh vanguard status`)");
      }

      // CFG-301: High-autonomy settings without Tier-1 Commander
      if (config.vanguard && config.vanguard.enabled && !hasTier1) {
        warn("CFG-301  Vanguard enabled without a claimed Tier-1 Commander — autonomous innovation lacks oversight");
      }
    } catch {
      // Scanner failure should not break doctor
      log("    " + style.dim("Posture advisory skipped (scan error)"));
    }
  }

  // ── 7. Gitignore ──────────────────────────────────────────────────
  log("\n" + style.bold("Gitignore") + "\n");

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
  log(`${style.green(String(results.pass))}/${total} passed  ·  ${style.yellow(String(results.warn))} warning(s)  ·  ${style.red(String(results.fail))} failure(s)\n`);

  if (results.fail > 0) {
    log(style.boldRed("HULL BREACH — resolve failures above before flight.") + "\n");
    return 1;
  } else if (results.warn > 0) {
    log(style.boldYellow("HULL INTACT — minor drift detected. Review warnings.") + "\n");
    return 0;
  } else {
    log(style.boldGreen("ALL SYSTEMS NOMINAL — ready for sortie.") + "\n");
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
  const cols = Math.min(process.stdout.columns || 79, 79);
  const bdr = (ch) => style.dimCyan(ch);
  const lbl = (s) => style.bold(s);
  const topBorder    = bdr("┌") + bdr("─".repeat(77)) + bdr("┐");
  const midBorder    = bdr("├") + bdr("─".repeat(77)) + bdr("┤");
  const bottomBorder = bdr("└") + bdr("─".repeat(77)) + bdr("┘");
  const row = (content) => `${bdr("│")}  ${content}${" ".repeat(Math.max(0, 75 - stripAnsi(content).length))}${bdr("│")}`;
  const blank = row("");

  console.log(`
${topBorder}`);
  console.log(row(gradient(`MERCURY MESH v${VERSION}`) + "  —  " + style.bold("BRIDGE TELEMETRY")));
  console.log(midBorder);
  console.log(blank);
  console.log(row(lbl("SYSTEM STATE")));;

  const halted = config.halted ? style.boldRed("YES ■ ALL STOP") : style.green("NO");
  const orgMode = config.orgMode ? style.green("ENABLED") : style.dim("DISABLED");
  const haltBar = config.halted
    ? style.red("░".repeat(20)) + "  " + style.boldRed("HALTED")
    : style.green("█".repeat(20)) + "  " + style.boldGreen("ONLINE");

  console.log(row(`  ${style.dim("Halted")}          ${halted}`));
  console.log(row(`  ${style.dim("Org Mode")}        ${orgMode}`));
  console.log(row(`  ${style.dim("Bridge Status")}   ${haltBar}`));
  console.log(row(`  ${style.dim("Agent Prompt")}    ${agentVersion ? `v${agentVersion}${agentVersion !== VERSION ? style.yellow(` (package: v${VERSION})`) : style.green(" ✓")}` : style.red("not found")}`));
  console.log(row(`  ${style.dim("Default Model")}   ${(config.modelRouting && config.modelRouting.default) || "—"}`));

  console.log(blank);
  console.log(row(lbl("CREW")));

  if (members && members.length > 0) {
    console.log(row(`  ${style.dim("Roster")}          ${members.length} Wing(s)`));
    console.log(row(`  ${style.dim("Active")}          ${style.green(String(statusCounts.active))}`));
    console.log(row(`  ${style.dim("Probation")}       ${style.yellow(String(statusCounts.probation))}`));
    console.log(row(`  ${style.dim("Shadow")}          ${style.dim(String(statusCounts.shadow))}`));
  } else {
    console.log(row(`  ${style.dim("Roster")}          ${style.yellow("EMPTY — bridge unclaimed")}`));
  }

  console.log(blank);
  console.log(row(lbl("ORGANIZATION")));
  console.log(row(`  ${style.dim("Departments")}     ${String(activeDepts.length)}`));
  console.log(row(`  ${style.dim("Ghost Wings")}     ${String(ghostDepts.length)}${ns.ghostWings && ns.ghostWings.autoMaterialize ? style.green(" (auto-materialize)") : style.dim(" (manual approval)")}`));
  console.log(row(`  ${style.dim("Decisions")}       ${inboxCount > 0 ? style.yellow(`${inboxCount} pending in inbox`) : style.dim("inbox clear")}`));

  console.log(blank);
  console.log(row(lbl("NERVOUS SYSTEM")));

  if (ns.enabled) {
    const provider = ns.embeddingProvider || "tfidf";
    const hasKey = !!(ns.embeddingApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
    const keyStatus = provider === "tfidf" ? "—" : hasKey ? style.green("configured") : style.boldRed("MISSING");

    console.log(row(`  ${style.dim("Status")}          ${style.boldGreen("ONLINE")}`));
    console.log(row(`  ${style.dim("Phase I")}         ${style.cyan("Gravimetry")}     :: ${provider}${provider !== "tfidf" ? ` (key: ${keyStatus})` : ""}`));
    console.log(row(`  ${style.dim("Phase II")}        ${style.cyan("Autonomic Core")} :: pulse ${(ns.autonomic && ns.autonomic.pulseMs) || 30000}ms`));
    console.log(row(`  ${style.dim("Phase III")}       ${style.cyan("Ghost Wings")}    :: ${ns.ghostWings && ns.ghostWings.enabled ? style.green("armed") : style.dim("disabled")}`));
    const constellationLabel = entryCount === "lancedb"
      ? `${style.cyan("Constellation")}  :: lancedb (indexed)`
      : `${style.cyan("Constellation")}  :: ${entryCount} embedding(s)${manifest && manifest.dimensions ? ` (${manifest.dimensions}D)` : ""}${constellationProvider !== "json" ? ` [${constellationProvider}]` : ""}`;
    console.log(row(`  ${style.dim("Phase IV")}        ${constellationLabel}`));
  } else {
    console.log(row(`  ${style.dim("Status")}          ${style.dim("OFFLINE")}`));
  }

  console.log(blank);
  console.log(row(lbl("SESSIONS")));
  console.log(row(`  ${style.dim("Total")}           ${String(sessionCount)}`));

  if (lastSession) {
    console.log(row(`  ${style.dim("Last Active")}     ${lastSession.lastActiveAt || lastSession.createdAt || "—"}`));
    console.log(row(`  ${style.dim("Messages")}        ${String(lastSession.messageCount)}`));
  }

  console.log(blank);
  console.log(bottomBorder);
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
  log("\n" + style.bold("LAST ACTIVITY") + "\n");

  const summary = summarizeMessages(session.messages, 4);
  if (summary.length > 0) {
    for (const line of summary) {
      log(`  ${line}`);
    }
  } else {
    log("  (no agent messages recorded)");
  }

  // ── 4. Pending work ───────────────────────────────────────────────
  log("\n" + style.bold("PENDING WORK") + "\n");

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
  log("\n" + style.bold("GIT STATE") + "\n");

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

  log("\n" + style.bold("RECOVERY BRIEFING") + "\n");

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
      log(`  ${style.dim("BRANCH")}                              ${style.dim("PATH")}`);
      log("  " + style.dimCyan("\u2500".repeat(70)));
      for (const wt of worktrees) {
        const branch = wt.branch || "(detached)";
        const isMesh = branch.startsWith("mesh/") ? style.cyan(" [mesh]") : "";
        log(`  ${pad(branch, 38)}${isMesh ? style.bold(branch) + isMesh : branch}  ${style.dim(wt.path)}`);
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

    log(style.bold("WORKTREE HEALTH") + "\n");
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

    log(style.bold(`GHOST WING OVERLAP SCAN`) + "\n");
    log(`  Active ghosts     ${report.ghostCount}`);
    log(`  Overlaps found    ${report.overlapCount}`);
    log(`  Auto-coalescible  ${report.autoCoalesce}`);
    log(`  Flagged for review ${report.flagForReview}`);

    if (report.overlaps.length > 0) {
      log("\n  OVERLAPPING PAIRS:");
      log("  " + "\u2500".repeat(70));
      for (const o of report.overlaps) {
        const risk = o.score >= gc.COALESCENCE_AUTO_THRESHOLD ? style.boldRed("HIGH") : style.yellow("MODERATE");
        log(`  [${risk}] ${pad(o.wingAName || o.wingA, 20)} \u2194 ${pad(o.wingBName || o.wingB, 20)}  score: ${style.bold(String(o.score))}`);
        log(`         ${style.dim(`domain: ${o.signals.domain}  keywords: ${o.signals.keywords}  files: ${o.signals.files}  attractors: ${o.signals.attractors}`)}`);
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

    log(style.bold(`COALESCENCE APPLIED`) + "\n");
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

    log(style.bold("PEER REGISTRY") + "\n");
    log(`  Total peers   ${peers.length}`);
    log(`  Healthy       ${healthy.length}`);
    log(`  Stale         ${stale.length}`);
    log(`  Halted        ${halted.length}`);
    log(`  Local node    ${localId}`);

    if (peers.length > 0) {
      log(`\n  ${style.dim("NODE ID")}       ${style.dim("ALIAS")}                ${style.dim("STATUS")}     ${style.dim("LAST HEARTBEAT")}`);
      log("  " + style.dimCyan("\u2500".repeat(70)));
      for (const p of peers) {
        const status = p.halted
          ? style.red("HALTED")
          : p._staleMinutes
            ? style.yellow(`STALE (${p._staleMinutes}m)`)
            : style.green("HEALTHY");
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

    log(style.bold("REGISTERED") + "\n");
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

    log(style.bold("SYNC COMPLETE") + "\n");
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

    log(style.bold("FLEET HEALTH") + "\n");
    log(`  Total nodes   ${peers.length}`);
    log(`  Healthy       ${healthy.length}`);
    log(`  Stale         ${stale.length}`);
    log(`  Halted        ${halted.length}`);

    const fleetHealth = peers.length > 0
      ? Math.round((healthy.length / peers.length) * 100)
      : 100;

    const healthColor = fleetHealth >= 80 ? style.boldGreen : fleetHealth >= 50 ? style.boldYellow : style.boldRed;
    log(`\n  ${style.dim("Fleet health")}  ${healthColor(fleetHealth + "%")}`);

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

    log(style.bold("PRUNE COMPLETE") + "\n");
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

// ─── Vanguard ──────────────────────────────────────────────────────────

function loadVanguardRuntimeConfig(meshDir) {
  const configPath = path.join(meshDir, "config.json");
  const localPath = path.join(meshDir, "local.json");
  const baseConfig = readJsonSafe(configPath) || {};
  const localConfig = readJsonSafe(localPath) || {};
  const baseV = baseConfig.vanguard || {};
  const localV = localConfig.vanguard || {};

  return {
    ...baseV,
    ...localV,
    outrider: {
      ...(baseV.outrider || {}),
      ...(localV.outrider || {}),
    },
    skunkworks: {
      ...(baseV.skunkworks || {}),
      ...(localV.skunkworks || {}),
    },
    horizonDeck: {
      ...(baseV.horizonDeck || {}),
      ...(localV.horizonDeck || {}),
    },
    speculativeSortie: {
      ...(baseV.speculativeSortie || {}),
      ...(localV.speculativeSortie || {}),
    },
    genesis: {
      ...(baseV.genesis || {}),
      ...(localV.genesis || {}),
    },
  };
}

function printVanguardCandidateList(map) {
  log(style.bold("OUTRIDER — ADJACENCY MAP") + "\n");
  log(`  Last scan      ${map.lastScan || "never"}`);
  log(`  Candidates     ${map.candidates.length}\n`);

  if (map.candidates.length > 0) {
    log(`  ${style.dim("ID")}                  ${style.dim("SCORE")}  ${style.dim("STATUS")}       ${style.dim("DOMAIN")}`);
    log("  " + style.dimCyan("\u2500".repeat(70)));

    const sorted = [...map.candidates].sort((a, b) => b.score - a.score);
    for (const c of sorted) {
      const statusColor = c.status === "discovered" ? style.green
        : c.status === "promoted" ? style.cyan
        : style.dim;
      log(`  ${pad(c.id, 20)}${pad(String(c.score), 7)}${pad(statusColor(c.status), 13)}${(c.domain || []).join(", ")}`);
    }
  } else {
    log("  No adjacency candidates discovered yet.");
  }

  log("");
}

async function runVanguard(targetRoot, vArgs) {
  const meshDir = path.join(targetRoot, ".mesh");
  const sub = vArgs[0] || "status";
  const vanguardConfig = loadVanguardRuntimeConfig(meshDir);

  heading(`Mercury Mesh v${VERSION} — Vanguard`);
  log(`target: ${targetRoot}\n`);

  if (!fs.existsSync(meshDir)) {
    log("No .mesh/ directory found. Run 'mercury-mesh init' first.\n");
    return 1;
  }

  let vMod;
  try {
    vMod = require(path.join(
      path.resolve(__dirname, ".."),
      ".mesh",
      "nervous-system",
      "vanguard",
      "index.js"
    ));
  } catch (err) {
    log(`Vanguard module not available: ${err.message}\n`);
    return 1;
  }

  if (sub === "status") {
    const diag = vMod.diagnostics(meshDir);

    log(style.bold("VANGUARD STATUS") + "\n");

    log("  " + style.cyan("OUTRIDER"));
    log(`    Last scan        ${diag.outrider.lastScan || "never"}`);
    log(`    Candidates       ${diag.outrider.candidates}`);
    if (diag.outrider.topCandidate) {
      log(`    Top candidate    ${diag.outrider.topCandidate.id} (score: ${diag.outrider.topCandidate.score})`);
    }

    log("\n  " + style.cyan("SKUNKWORKS"));
    log(`    Active           ${diag.skunkworks.active}`);
    log(`    Completed        ${diag.skunkworks.completed}`);
    log(`    Dissolved        ${diag.skunkworks.dissolved}`);
    log(`    Tokens burned    ${diag.skunkworks.totalTokensBurned}`);

    log("\n  " + style.cyan("HORIZON DECK"));
    log(`    Pending          ${diag.horizonDeck.pending}`);
    log(`    Authorized       ${diag.horizonDeck.authorized}`);
    log(`    Capacity         ${diag.horizonDeck.available}/${diag.horizonDeck.capacity} available`);

    log("\n  " + style.cyan("GENESIS"));
    log(`    Integrated       ${diag.genesis.integrated}`);
    log(`    Awaiting auth    ${diag.genesis.awaitingAuth}`);

    log("\n  " + style.cyan("SORTIES"));
    log(`    Total generated  ${diag.sorties.totalGenerated}`);
    log(`    Last generated   ${diag.sorties.lastGenerated || "never"}`);

    log("");
    return 0;
  }

  if (sub === "horizon") {
    const horizonSub = vArgs[1] || "list";

    if (horizonSub === "list") {
      const pending = vMod.horizonDeck.listPending(meshDir);
      const deckStats = vMod.horizonDeck.stats(meshDir);

      log(style.bold("HORIZON DECK") + "\n");

      if (pending.length === 0) {
        log("  No pending items on the Horizon Deck.\n");
      } else {
        log(`  ${style.dim("ID")}                  ${style.dim("TYPE")}              ${style.dim("AGE")}    ${style.dim("TITLE")}`);
        log("  " + style.dimCyan("\u2500".repeat(70)));

        for (const item of pending) {
          const age = Math.round((Date.now() - new Date(item.stagedAt).getTime()) / (1000 * 60 * 60 * 24));
          const typeTag = item.type === "genesis-proposal" ? "GENESIS"
            : item.type === "speculative-sortie" ? "SORTIE"
            : item.type === "skill-draft" ? "SKILL"
            : item.type.toUpperCase();
          log(`  ${pad(item.id, 20)}${pad(typeTag, 18)}${pad(age + "d", 7)}${item.title}`);
        }
      }

      log(`\n  PENDING: ${deckStats.pending}   CAPACITY: ${deckStats.available}/${deckStats.capacity}`);
      log("");
      return 0;
    }

    if (horizonSub === "authorize") {
      const itemId = vArgs[2];
      if (!itemId) {
        log("Usage: mercury-mesh vanguard horizon authorize <item-id> [--notes <notes>]\n");
        return 1;
      }
      const notesIdx = vArgs.indexOf("--notes");
      const notes = notesIdx !== -1 ? vArgs.slice(notesIdx + 1).join(" ") : undefined;
      const inspection = vMod.horizonDeck.inspectItem(meshDir, itemId);
      if (!inspection.item) {
        log(style.boldRed("FAILED") + ` Item "${itemId}" not found\n`);
        return 1;
      }

      if (inspection.item.type === "genesis-proposal" && inspection.item.proposalRef) {
        const authResult = vMod.genesis.authorizeProposal(
          meshDir,
          inspection.item.proposalRef,
          "commander",
          notes,
        );
        if (!authResult.success) {
          log(style.boldRed("FAILED") + ` ${authResult.reason}\n`);
          return 1;
        }
      }

      if (inspection.item.type === "speculative-sortie" && inspection.item.proposalRef) {
        const approveResult = vMod.speculativeSortie.approveSortie(meshDir, inspection.item.proposalRef, {
          config: {
            ...vanguardConfig.speculativeSortie,
            ...vanguardConfig.skunkworks,
          },
          authorizedBy: "commander",
          notes,
        });
        if (!approveResult.success) {
          log(style.boldRed("FAILED") + ` ${approveResult.reason}\n`);
          return 1;
        }
      }

      const result = vMod.horizonDeck.authorizeItem(meshDir, itemId, "commander", notes);
      if (!result.success) {
        log(style.boldRed("FAILED") + ` ${result.reason}\n`);
        return 1;
      }

      log(style.boldGreen("AUTHORIZED") + ` ${itemId}`);
      if (inspection.item.type === "genesis-proposal" && inspection.item.proposalRef) {
        log(`  Genesis        ${inspection.item.proposalRef}`);
      }
      if (inspection.item.type === "speculative-sortie" && inspection.item.proposalRef) {
        const sortie = vMod.speculativeSortie.loadSortie(meshDir, inspection.item.proposalRef);
        if (sortie && sortie.experimentId) {
          log(`  Experiment     ${sortie.experimentId}`);
        }
      }
      log("");
      return 0;
    }

    if (horizonSub === "reject") {
      const itemId = vArgs[2];
      if (!itemId) {
        log("Usage: mercury-mesh vanguard horizon reject <item-id> [reason]\n");
        return 1;
      }
      const reason = vArgs.slice(3).join(" ") || undefined;
      const result = vMod.horizonDeck.rejectItem(meshDir, itemId, reason);
      if (result.success) {
        log(style.boldYellow("REJECTED") + ` ${itemId}\n`);
      } else {
        log(style.boldRed("FAILED") + ` ${result.reason}\n`);
      }
      return result.success ? 0 : 1;
    }

    if (horizonSub === "inspect") {
      const itemId = vArgs[2];
      if (!itemId) {
        log("Usage: mercury-mesh vanguard horizon inspect <item-id>\n");
        return 1;
      }
      const { item, proposalData } = vMod.horizonDeck.inspectItem(meshDir, itemId);
      if (!item) {
        log(`Item "${itemId}" not found.\n`);
        return 1;
      }
      log(style.bold("HORIZON ITEM") + "\n");
      log(`  ID            ${item.id}`);
      log(`  Type          ${item.type}`);
      log(`  Title         ${item.title}`);
      log(`  Status        ${item.status}`);
      log(`  Staged at     ${item.stagedAt}`);
      log(`  Decays at     ${item.decaysAt}`);
      log(`  Priority      ${item.priority}`);
      if (item.summary) log(`  Summary       ${item.summary}`);
      if (item.commanderNotes) log(`  Notes         ${item.commanderNotes}`);
      if (proposalData) {
        log("\n  " + style.dim("PROPOSAL DATA:"));
        log("  " + JSON.stringify(proposalData, null, 2).split("\n").join("\n  "));
      }
      log("");
      return 0;
    }

    log(`Unknown horizon subcommand: ${horizonSub}`);
    log("Available: list, authorize, reject, inspect\n");
    return 1;
  }

  if (sub === "skunkworks" || sub === "experiments") {
    const skunkworksSub = sub === "experiments" ? (vArgs[1] || "list") : (vArgs[1] || "list");
    const experiments = vMod.skunkworks.listExperiments(meshDir);

    if (skunkworksSub === "inspect") {
      const experimentId = vArgs[2];
      if (!experimentId) {
        log("Usage: mercury-mesh vanguard skunkworks inspect <experiment-id>\n");
        return 1;
      }
      const experiment = vMod.skunkworks.loadExperiment(meshDir, experimentId);
      if (!experiment) {
        log(`Experiment "${experimentId}" not found.\n`);
        return 1;
      }
      const rdWing = vMod.rdWing.loadRdWing(meshDir, experimentId);

      log(style.bold("SKUNKWORKS EXPERIMENT") + "\n");
      log(`  ID             ${experiment.id}`);
      log(`  Title          ${experiment.title}`);
      log(`  Status         ${experiment.status}`);
      log(`  Origin         ${(experiment.origin && experiment.origin.type) || "unknown"}`);
      log(`  Created        ${experiment.createdAt}`);
      log(`  Hypothesis     ${experiment.hypothesis || "—"}`);
      log(`  Domain         ${(experiment.domain || []).join(", ") || "—"}`);
      if (rdWing) {
        const ttl = vMod.rdWing.checkRdTTL(rdWing);
        const budget = vMod.rdWing.checkRdBudget(rdWing);
        log(`  R&D Wing       ${rdWing.id}`);
        log(`  TTL            ${ttl.expired ? "expired" : `${ttl.hoursRemaining}h remaining`}`);
        log(`  Budget         ${budget.used}/${budget.budget} (${budget.percentUsed}%)`);
      }
      if (experiment.results) {
        log("\n  " + style.dim("RESULTS:"));
        log("  " + JSON.stringify(experiment.results, null, 2).split("\n").join("\n  "));
      }
      log("");
      return 0;
    }

    if (skunkworksSub === "dissolve") {
      const experimentId = vArgs[2];
      if (!experimentId) {
        log("Usage: mercury-mesh vanguard skunkworks dissolve <experiment-id> [reason]\n");
        return 1;
      }
      const reason = vArgs.slice(3).join(" ") || "Commander-requested dissolution";
      const result = vMod.skunkworks.dissolveExperiment(meshDir, experimentId, "commander-stop", reason);
      if (!result.success) {
        log(style.boldRed("FAILED") + ` ${result.reason}\n`);
        return 1;
      }
      log(style.boldYellow("DISSOLVED") + ` ${experimentId}`);
      log(`  Tokens consumed ${result.tokensConsumed}`);
      log("");
      return 0;
    }

    log(style.bold("SKUNKWORKS EXPERIMENTS") + "\n");
    log(`  Active         ${experiments.active.length}`);
    log(`  Completed      ${experiments.completed.length}`);
    log(`  Dissolved      ${experiments.dissolved.length}`);
    log(`  Tokens burned  ${experiments.totalTokensBurned}`);

    if (experiments.active.length > 0) {
      log("\n  ACTIVE:");
      for (const id of experiments.active) {
        const exp = vMod.skunkworks.loadExperiment(meshDir, id);
        if (exp) {
          log(`    ${pad(id, 20)}${exp.title}`);
        }
      }
    }

    log("");
    return 0;
  }

  if (sub === "outrider") {
    const outriderSub = vArgs[1] || "list";

    if (outriderSub === "scan") {
      const result = await vMod.outrider.scan(meshDir, {
        config: { outrider: vanguardConfig.outrider },
      });
      log(style.bold("OUTRIDER SCAN COMPLETE") + "\n");
      log(`  New candidates  ${result.newCandidates.length}`);
      log(`  Total candidates ${result.totalCandidates}`);
      if (result.newCandidates.length > 0) {
        log(`  Top new         ${result.newCandidates[0].id} (${result.newCandidates[0].score})`);
      }
      log("");
      return 0;
    }

    if (outriderSub === "dismiss") {
      const candidateId = vArgs[2];
      if (!candidateId) {
        log("Usage: mercury-mesh vanguard outrider dismiss <candidate-id>\n");
        return 1;
      }
      const result = vMod.outrider.dismissCandidate(meshDir, candidateId);
      if (!result.success) {
        log(style.boldRed("FAILED") + ` ${result.reason}\n`);
        return 1;
      }
      log(style.boldYellow("DISMISSED") + ` ${candidateId}\n`);
      return 0;
    }

    printVanguardCandidateList(vMod.outrider.loadAdjacencyMap(meshDir));
    return 0;
  }

  if (sub === "genesis") {
    const genesisSub = vArgs[1] || "status";

    if (genesisSub === "inspect") {
      const proposalId = vArgs[2];
      if (!proposalId) {
        log("Usage: mercury-mesh vanguard genesis inspect <proposal-id>\n");
        return 1;
      }
      const proposal = vMod.genesis.loadProposal(meshDir, proposalId);
      if (!proposal) {
        log(`Genesis proposal "${proposalId}" not found.\n`);
        return 1;
      }
      log(style.bold("GENESIS PROPOSAL") + "\n");
      log("  " + JSON.stringify(proposal, null, 2).split("\n").join("\n  "));
      log("");
      return 0;
    }

    if (genesisSub === "integrate") {
      const proposalId = vArgs[2];
      if (!proposalId) {
        log("Usage: mercury-mesh vanguard genesis integrate <proposal-id>\n");
        return 1;
      }
      const result = vMod.genesis.integrate(meshDir, proposalId, {
        config: vanguardConfig.genesis,
      });
      if (!result.success) {
        log(style.boldRed("FAILED") + ` ${result.reason}\n`);
        return 1;
      }
      log(style.boldGreen("INTEGRATED") + ` ${proposalId}`);
      log(`  Skills         ${result.integrated.skills.length}`);
      log(`  Wings          ${result.integrated.wings.length}`);
      if (result.integrated.errors.length > 0) {
        log(`  Errors         ${result.integrated.errors.length}`);
      }
      log("");
      return 0;
    }

    const proposals = vMod.genesis.listProposals(meshDir);
    const cooldowns = vMod.genesis.checkCooldowns(meshDir);

    log(style.bold("GENESIS PROTOCOLS") + "\n");
    log(`  Active cooldowns ${cooldowns.active.length}`);
    log(`  Completed       ${cooldowns.completed.length}`);
    log(`  Anomalies       ${cooldowns.anomalies.length}\n`);

    if (proposals.length === 0) {
      log("  No Genesis proposals.\n");
    } else {
      for (const p of proposals) {
        const statusColor = p.status === "complete" ? style.green
          : p.status === "integrated" ? style.cyan
          : p.status === "awaiting-authorization" ? style.yellow
          : style.dim;
        log(`  ${pad(p.id, 20)}${pad(statusColor(p.status), 26)}${p.title}`);
      }
    }

    log("");
    return 0;
  }

  if (sub === "sorties") {
    const sorties = vMod.speculativeSortie.listSorties(meshDir);

    log(style.bold("SPECULATIVE SORTIES") + "\n");

    if (sorties.length === 0) {
      log("  No speculative sorties generated yet.\n");
    } else {
      for (const s of sorties) {
        const statusColor = s.status === "approved" ? style.green
          : s.status === "drafted" ? style.yellow
          : style.dim;
        log(`  ${pad(s.id, 20)}${pad(statusColor(s.status), 16)}${pad(String(s.score || ""), 7)}${s.title}`);
      }
    }

    log("");
    return 0;
  }

  log(`Unknown subcommand: ${sub}`);
  log("Available: status, horizon, skunkworks, experiments, outrider, genesis, sorties\n");
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
      log(`${style.red("remove")}  ${style.dim(label)}`);
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
      log(`${style.green("remove")}  ${style.dim(".github/agents/")}  ${style.dim("(empty)")}`);
    }
  }

  // ── 3. Remove mesh skills ────────────────────────────────────────
  log("\nSKILLS\n");
  rm(path.join(targetRoot, ".copilot", "skills"), ".copilot/skills/");

  // Keep .copilot/mcp-config.json if it exists (user may have customized)
  const mcpConfig = path.join(targetRoot, ".copilot", "mcp-config.json");
  if (fs.existsSync(mcpConfig)) {
    log(`${style.dim("keep")}    ${style.dim(".copilot/mcp-config.json")}  ${style.dim("(may contain user config)")}`);
    skippedCount++;
  }

  // Clean up empty .copilot/ dir
  const copilotDir = path.join(targetRoot, ".copilot");
  if (fs.existsSync(copilotDir)) {
    const remaining = fs.readdirSync(copilotDir);
    if (remaining.length === 0) {
      fs.rmdirSync(copilotDir);
      log(`${style.green("remove")}  ${style.dim(".copilot/")}  ${style.dim("(empty)")}`);
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
      log(`${style.green("remove")}  ${style.dim(".github/workflows/")}  ${style.dim("(empty)")}`);
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
      log(`${style.green("patch")}   ${style.dim(".gitignore")}  ${style.dim(`(removed ${lines.length - cleaned.length} mesh lines)`)}`);
    } else {
      log(`${style.dim("skip")}    ${style.dim(".gitignore")}  ${style.dim("(no mesh entries found)")}`);
    }
  } else {
    log("(no .gitignore)");
  }

  // ── Summary ───────────────────────────────────────────────────────
  log("");
  log(`Ejected. ${style.boldGreen(String(removedCount))} item(s) removed, ${style.dim(String(skippedCount))} preserved.`);
  log(`${style.dim("Mercury Mesh has been cleanly removed from this project.")}\n`);

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
  log(`${style.green("write")} ${style.dim(`.copilot/skills/${slug}/SKILL.md`)}`);

  // Mirror to template seeds (keep in sync)
  if (fs.existsSync(path.join(targetRoot, ".mesh", "templates", "skills"))) {
    ensureDir(templateDir);
    fs.writeFileSync(path.join(templateDir, "SKILL.md"), content, "utf-8");
    log(`${style.green("write")} ${style.dim(`.mesh/templates/skills/${slug}/SKILL.md`)}`);
    log(style.dim("Live and template skills are in sync."));
  } else {
    log(`${style.dim("skip")}  ${style.dim(".mesh/templates/skills/ (directory not found — template sync skipped)")}`);
  }

  log(`\nSkill ${style.bold(`"${slug}"`)} created. Edit ${style.cyan(`.copilot/skills/${slug}/SKILL.md`)} to fill in patterns.\n`);
  return 0;
}

// ─── Config Recommend / Tune Commands ──────────────────────────────────

function runConfigRecommend(targetRoot, flags) {
  heading(`Mercury Mesh v${VERSION} — Config Recommend`);
  log(`target: ${targetRoot}\n`);

  const configPath = path.join(targetRoot, ".mesh", "config.json");
  if (!fs.existsSync(configPath)) {
    log(style.red("No .mesh/config.json found — run `mercury-mesh init` first.\n"));
    return 1;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    log(style.red(`Failed to parse config.json: ${e.message}\n`));
    return 1;
  }

  const spinner = createSpinner("Scanning hull profile");
  const scanResult = detectRepoComplexity(targetRoot);
  const resolved = resolveRecommendedProfile(scanResult);
  spinner.stop("✓", style.green);

  log("");
  log(`  ${style.boldCyan("HULL PROFILE DETECTED")} ${style.dim("::")} ${style.bold(resolved.label)}`);
  log(`  ${style.dim("CONFIDENCE")}            ${style.dim("::")} ${scanResult.confidence.toUpperCase()}`);

  if (scanResult.reasons.length > 0) {
    log("");
    log(`  ${style.dim("SIGNALS")}`);
    for (const reason of scanResult.reasons) {
      log(`    ${style.dim("—")} ${style.dim(reason)}`);
    }
  }

  // Compute diffs between current config and recommended
  const rec = resolved.config;
  const diffs = [];

  if (config.orgMode !== rec.orgMode) {
    diffs.push({ key: "orgMode", current: config.orgMode, recommended: rec.orgMode });
  }
  const nsEnabled = config.nervousSystem ? config.nervousSystem.enabled : false;
  if (nsEnabled !== rec.nervousSystem.enabled) {
    diffs.push({ key: "nervousSystem.enabled", current: nsEnabled, recommended: rec.nervousSystem.enabled });
  }
  // Ghost Wings are active when nervousSystem is on; autoMaterialize is the explicit toggle
  const autoMat = config.nervousSystem && config.nervousSystem.ghostWings
    ? !!config.nervousSystem.ghostWings.autoMaterialize : false;
  if (autoMat !== rec.ghostWings.autoMaterialize) {
    diffs.push({ key: "ghostWings.autoMaterialize", current: autoMat, recommended: rec.ghostWings.autoMaterialize });
  }

  log("");
  if (diffs.length === 0) {
    log(`  ${style.boldGreen("POSTURE ALIGNED")} — current config matches recommended profile.\n`);
  } else {
    log(`  ${style.bold("RECOMMENDED CHANGES")}\n`);
    for (const d of diffs) {
      const cur = d.current ? style.green("ON") : style.dim("OFF");
      const rec = d.recommended ? style.green("ON") : style.dim("OFF");
      log(`    ${style.cyan(d.key.padEnd(28))} ${cur} ${style.dim("→")} ${rec}`);
    }
    log("");
    log(`  ${style.dim("Run")} ${style.cyan("mercury-mesh config tune")} ${style.dim("to apply changes interactively.")}\n`);
  }

  if (flags.json) {
    const output = {
      profile: scanResult.profile,
      confidence: scanResult.confidence,
      signals: scanResult.signals,
      reasons: scanResult.reasons,
      diffs,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  return 0;
}

async function runConfigTune(targetRoot, flags) {
  heading(`Mercury Mesh v${VERSION} — Config Tune`);
  log(`target: ${targetRoot}\n`);

  const configPath = path.join(targetRoot, ".mesh", "config.json");
  if (!fs.existsSync(configPath)) {
    log(style.red("No .mesh/config.json found — run `mercury-mesh init` first.\n"));
    return 1;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    log(style.red(`Failed to parse config.json: ${e.message}\n`));
    return 1;
  }

  const spinner = createSpinner("Scanning hull profile");
  const scanResult = detectRepoComplexity(targetRoot);
  const resolved = resolveRecommendedProfile(scanResult);
  spinner.stop("✓", style.green);

  log("");
  log(`  ${style.boldCyan("HULL PROFILE DETECTED")} ${style.dim("::")} ${style.bold(resolved.label)}`);
  log(`  ${style.dim("CONFIDENCE")}            ${style.dim("::")} ${scanResult.confidence.toUpperCase()}`);
  log("");

  const rec = resolved.config;
  let changed = false;

  // Walk through each tunable setting
  if (config.orgMode !== rec.orgMode) {
    const cur = config.orgMode ? "ON" : "OFF";
    const recLabel = rec.orgMode ? "ON" : "OFF";
    log(`  ${style.dim("orgMode is")} ${cur}${style.dim(", recommended:")} ${recLabel}`);
    const answer = await confirm(
      "Coordinate work as a structured multi-department formation?",
      rec.orgMode
    );
    if (answer !== config.orgMode) {
      config.orgMode = answer;
      changed = true;
    }
  }

  const nsEnabled = config.nervousSystem ? config.nervousSystem.enabled : false;
  if (nsEnabled !== rec.nervousSystem.enabled) {
    const cur = nsEnabled ? "ON" : "OFF";
    const recLabel = rec.nervousSystem.enabled ? "ON" : "OFF";
    log(`  ${style.dim("nervousSystem is")} ${cur}${style.dim(", recommended:")} ${recLabel}`);
    const answer = await confirm(
      "Enable the Nervous System (semantic routing + adaptive mesh)?",
      rec.nervousSystem.enabled
    );
    if (answer !== nsEnabled) {
      if (!config.nervousSystem) config.nervousSystem = {};
      config.nervousSystem.enabled = answer;
      changed = true;
    }
  }

  // Vanguard always requires explicit approval
  if (!config.vanguard || !config.vanguard.enabled) {
    const answer = await confirm(
      "Allow the Mesh to propose and stage autonomous innovation experiments?",
      false
    );
    if (answer) {
      if (!config.vanguard) config.vanguard = {};
      config.vanguard.enabled = true;
      changed = true;
    }
  }

  // autoMaterialize always requires explicit approval
  const autoMat = config.nervousSystem && config.nervousSystem.ghostWings
    && config.nervousSystem.ghostWings.autoMaterialize;
  if (!autoMat) {
    const answer = await confirm(
      "Auto-form Ghost Wings for unclaimed domains? (requires Commander trust)",
      false
    );
    if (answer) {
      if (!config.nervousSystem) config.nervousSystem = {};
      if (!config.nervousSystem.ghostWings) config.nervousSystem.ghostWings = {};
      config.nervousSystem.ghostWings.autoMaterialize = true;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    log(`\n  ${style.green("write")} ${style.dim(".mesh/config.json")}  ${style.dim("(tuned)")}`);
    log(`  ${style.boldGreen("Configuration updated.")}\n`);
  } else {
    log(`\n  ${style.dim("No changes applied.")}\n`);
  }

  return 0;
}

function printUsage() {
  console.log(`
${gradient(`Mercury Mesh v${VERSION}`)} ${style.dim("— CLI")}

${style.bold("Usage:")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("init")}    ${style.dim("[--force] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("update")}  ${style.dim("[--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("doctor")}  ${style.dim("[--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("status")}  ${style.dim("[--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("config")}  ${style.dim("[recommend|tune] [--json] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("create-skill")} ${style.dim("<name> [--description <desc>] [--domain <domain>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("resume")}  ${style.dim("[--session <id>] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("eject")}   ${style.dim("[--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("worktree")} ${style.dim("[list|status|prune] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("coalescence")} ${style.dim("[scan|apply] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("peers")} ${style.dim("[list|register|sync|health|prune] [--target <path>]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("vanguard")} ${style.dim("[status|horizon|skunkworks|outrider|genesis|sorties]")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("github-mcp")}
  ${style.cyan("npx @mizyoel/mercury-mesh")} ${style.bold("version")}

${style.bold("Commands:")}
  ${style.cyan("init")}     Scaffold Copilot agent, skills, workflows, and .mesh/ runtime
           into the target project. Existing files are preserved unless --force.
  ${style.cyan("update")}   Overwrite agent prompt, skills, and copilot-instructions with the
           latest from this package version. Config and team files are untouched.
  ${style.cyan("doctor")}   Run hull diagnostics: validate config, structure, skills, nervous
           system, secrets, and version alignment. Paste output for bug reports.
  ${style.cyan("status")}   Bridge telemetry: crew roster, org health, nervous system, sessions,
           and pending decisions at a glance.
  ${style.cyan("create-skill")}
           Scaffold a new skill in .copilot/skills/ and .mesh/templates/skills/.
           Creates SKILL.md with frontmatter and section stubs.
  ${style.cyan("resume")}   Recover from an interrupted sortie: show last session context,
           pending decisions, uncommitted work, and a recovery briefing.
  ${style.cyan("eject")}    Remove Mercury Mesh from the project. Strips .mesh/, agent prompt,
           skills, workflows, and .gitignore entries. Keeps mcp-config.json.
  ${style.cyan("worktree")} List, inspect, and prune git worktrees for parallel Wing execution.
           Subcommands: list (all worktrees), status (health), prune (cleanup).
  ${style.cyan("coalescence")}
           Detect overlapping Ghost Wings and auto-merge compatible pairs.
           Subcommands: scan (report only), apply (merge high-confidence overlaps).
  ${style.cyan("peers")}    Multi-machine coordination: register nodes, sync constellation,
           and monitor fleet health. Subcommands: list, register, sync, health, prune.
  ${style.cyan("vanguard")} Autonomous innovation subsystem: scan adjacencies, manage experiments,
           review proposals, and authorize Genesis integrations.
           Subcommands: status, horizon, skunkworks (alias: experiments), outrider, genesis, sorties.
  ${style.cyan("config")}   Analyze hull profile and recommend posture changes, or re-tune
           configuration interactively. Subcommands: recommend (read-only), tune (write).
  ${style.cyan("github-mcp")}  Start the GitHub MCP server using gh auth token for local auth.
  ${style.cyan("version")}  Print package version.

${style.bold("Options:")}
  ${style.yellow("--force")}            Overwrite existing files during init
  ${style.yellow("--target")} ${style.dim("<path>")}    Target project root (default: current working directory)
  ${style.yellow("--session")} ${style.dim("<id>")}     Target a specific session for resume (default: most recent)
  ${style.yellow("--json")}             Machine-readable output for config recommend
`);
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
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

  notifyIfUpdateAvailable(command);

  switch (command) {
    case "init":
      await runInit(targetRoot, flags);
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
    case "vanguard": {
      const vArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "vanguard") continue;
        if (args[i] === "--target") { i++; continue; }
        vArgs.push(args[i]);
      }
      process.exit(await runVanguard(targetRoot, vArgs));
      break;
    }
    case "config": {
      const cfgArgs = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "config") continue;
        if (args[i] === "--target") { i++; continue; }
        cfgArgs.push(args[i]);
      }
      const cfgSub = cfgArgs.find((a) => !a.startsWith("-"));
      const cfgFlags = { json: cfgArgs.includes("--json") };
      if (cfgSub === "recommend") {
        process.exit(runConfigRecommend(targetRoot, cfgFlags));
      } else if (cfgSub === "tune") {
        process.exit(await runConfigTune(targetRoot, cfgFlags));
      } else {
        log(style.bold("\nUsage:"));
        log(`  ${style.cyan("mercury-mesh config recommend")}  ${style.dim("Analyze hull and print recommended diffs")}`);
        log(`  ${style.cyan("mercury-mesh config tune")}       ${style.dim("Re-run the configuration interview")}\n`);
        process.exit(cfgSub ? 1 : 0);
      }
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

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
