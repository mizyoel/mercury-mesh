const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const CLI_PATH = path.resolve(__dirname, "..", "bin", "mercury-mesh.cjs");
const FIXTURE_DIR = path.join(__dirname, ".cli-test-target");

function cleanFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
}

function runCLI(...args) {
  return execFileSync(process.execPath, [CLI_PATH, ...args], {
    cwd: FIXTURE_DIR,
    encoding: "utf-8",
    env: { ...process.env, MERCURY_MESH_DISABLE_UPDATE_CHECK: "1" },
  });
}

function runCLIWithEnv(args, extraEnv) {
  return execFileSync(process.execPath, [CLI_PATH, ...args], {
    cwd: FIXTURE_DIR,
    encoding: "utf-8",
    env: {
      ...process.env,
      MERCURY_MESH_DISABLE_UPDATE_CHECK: "1",
      ...extraEnv,
    },
  });
}

test("cli: version prints semver", () => {
  const out = execFileSync(process.execPath, [CLI_PATH, "version"], {
    encoding: "utf-8",
  });
  assert.match(out.trim(), /^\d+\.\d+\.\d+/);
});

test("cli: no command prints usage", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
    env: { ...process.env, MERCURY_MESH_DISABLE_UPDATE_CHECK: "1" },
  });
  assert.ok(out.includes("Usage:"));
  assert.ok(out.includes("github-mcp"));
});

test("cli: update notification appears when a newer npm version exists", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const out = runCLIWithEnv(["init"], {
    MERCURY_MESH_DISABLE_UPDATE_CHECK: "0",
    MERCURY_MESH_UPDATE_CHECK_FORCE: "1",
    MERCURY_MESH_UPDATE_CHECK_LATEST_VERSION: "9.9.9",
  });

  assert.ok(out.includes("NEW VECTOR"), "should notify about a newer package version");
  assert.ok(out.includes("9.9.9"), "should include the latest published version");
  assert.ok(out.includes("npm install -g @mizyoel/mercury-mesh@latest"), "should include upgrade guidance");

  cleanFixture();
});

test("cli: version command stays clean when an update exists", () => {
  const out = execFileSync(process.execPath, [CLI_PATH, "version"], {
    encoding: "utf-8",
    env: {
      ...process.env,
      MERCURY_MESH_DISABLE_UPDATE_CHECK: "0",
      MERCURY_MESH_UPDATE_CHECK_FORCE: "1",
      MERCURY_MESH_UPDATE_CHECK_LATEST_VERSION: "9.9.9",
    },
  });

  assert.match(out.trim(), /^\d+\.\d+\.\d+$/);
});

test("cli: init scaffolds expected files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const out = runCLI("init");
  assert.ok(out.includes("Scaffold Complete"));

  // Agent prompt
  assert.ok(
    fs.existsSync(
      path.join(FIXTURE_DIR, ".github", "agents", "mercury-mesh.agent.md")
    ),
    "agent prompt missing"
  );

  // Copilot instructions
  assert.ok(
    fs.existsSync(
      path.join(FIXTURE_DIR, ".github", "copilot-instructions.md")
    ),
    "copilot-instructions missing"
  );

  // Skills directory
  assert.ok(
    fs.existsSync(path.join(FIXTURE_DIR, ".copilot", "skills")),
    "skills dir missing"
  );

  const mcpConfig = fs.readFileSync(
    path.join(FIXTURE_DIR, ".copilot", "mcp-config.json"),
    "utf-8"
  );
  assert.ok(mcpConfig.includes('"github-mcp"'), "mcp config did not use github-mcp wrapper");

  // Config
  assert.ok(
    fs.existsSync(path.join(FIXTURE_DIR, ".mesh", "config.json")),
    "config.json missing"
  );

  const config = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, ".mesh", "config.json"), "utf-8")
  );

  assert.ok(
    fs.existsSync(path.join(FIXTURE_DIR, ".mesh", "local.json")),
    "local.json missing"
  );

  // Manifesto
  assert.ok(
    fs.existsSync(path.join(FIXTURE_DIR, ".mesh", "manifesto.md")),
    "manifesto missing"
  );

  // .gitignore patched
  const gi = fs.readFileSync(
    path.join(FIXTURE_DIR, ".gitignore"),
    "utf-8"
  );
  assert.ok(gi.includes(".mesh/log/"), ".gitignore not patched");
  assert.ok(gi.includes(".mesh/local.json"), ".mesh/local.json not ignored");

  cleanFixture();
});

test("cli: init does not overwrite existing files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // First init
  runCLI("init");

  // Write a custom marker into the config
  const configPath = path.join(FIXTURE_DIR, ".mesh", "config.json");
  const original = fs.readFileSync(configPath, "utf-8");
  fs.writeFileSync(configPath, original.replace('"version": 2', '"version": 999'));

  // Second init (should skip)
  const out = runCLI("init");
  assert.ok(out.includes("skip"));

  const after = fs.readFileSync(configPath, "utf-8");
  assert.ok(after.includes('"version": 999'), "config was overwritten without --force");

  cleanFixture();
});

test("cli: init --force overwrites existing files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // First init
  runCLI("init");

  // Second init with --force
  const out = runCLI("init", "--force");
  assert.ok(out.includes("Scaffold Complete"));

  cleanFixture();
});

test("cli: update refreshes managed scaffold assets and preserves user-owned files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // Init first
  runCLI("init");

  // User-owned files should survive update.
  const configPath = path.join(FIXTURE_DIR, ".mesh", "config.json");
  const original = fs.readFileSync(configPath, "utf-8");
  fs.writeFileSync(configPath, original.replace('"version": 2', '"version": 888'));

  const localPath = path.join(FIXTURE_DIR, ".mesh", "local.json");
  fs.writeFileSync(localPath, '{"customLocal":true}\n');

  const mcpPath = path.join(FIXTURE_DIR, ".copilot", "mcp-config.json");
  fs.writeFileSync(mcpPath, '{"customMcp":true}\n');

  // Managed scaffold assets should be refreshed from the package.
  const manifestoPath = path.join(FIXTURE_DIR, ".mesh", "manifesto.md");
  fs.writeFileSync(manifestoPath, "STALE MANIFESTO\n");

  const routingPath = path.join(FIXTURE_DIR, ".mesh", "routing.md");
  fs.writeFileSync(routingPath, "STALE ROUTING\n");

  const ceremoniesPath = path.join(FIXTURE_DIR, ".mesh", "ceremonies.md");
  fs.writeFileSync(ceremoniesPath, "STALE CEREMONIES\n");

  const instructionsPath = path.join(FIXTURE_DIR, ".github", "copilot-instructions.md");
  fs.writeFileSync(instructionsPath, "STALE INSTRUCTIONS\n");

  const skillPath = path.join(FIXTURE_DIR, ".copilot", "skills", "client-compatibility", "SKILL.md");
  fs.writeFileSync(skillPath, "STALE SKILL\n");

  const workflowPath = path.join(FIXTURE_DIR, ".github", "workflows", "mesh-release.yml");
  fs.writeFileSync(workflowPath, "stale: true\n");

  // Update
  const out = runCLI("update");
  assert.ok(out.includes("Update Complete"));
  assert.ok(out.includes("managed file(s) refreshed"));

  // User-owned files should NOT have been overwritten.
  const after = fs.readFileSync(configPath, "utf-8");
  assert.ok(after.includes('"version": 888'), "config was overwritten by update");
  assert.equal(fs.readFileSync(localPath, "utf-8"), '{"customLocal":true}\n');
  assert.equal(fs.readFileSync(mcpPath, "utf-8"), '{"customMcp":true}\n');

  // Managed scaffold assets should have been refreshed from the package.
  assert.equal(
    fs.readFileSync(manifestoPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".mesh", "manifesto.md"), "utf-8")
  );
  assert.equal(
    fs.readFileSync(routingPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".mesh", "templates", "routing.md"), "utf-8")
  );
  assert.equal(
    fs.readFileSync(ceremoniesPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".mesh", "templates", "ceremonies.md"), "utf-8")
  );
  assert.equal(
    fs.readFileSync(instructionsPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".mesh", "templates", "copilot-instructions.md"), "utf-8")
  );
  assert.equal(
    fs.readFileSync(skillPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".copilot", "skills", "client-compatibility", "SKILL.md"), "utf-8")
  );
  assert.equal(
    fs.readFileSync(workflowPath, "utf-8"),
    fs.readFileSync(path.join(PACKAGE_ROOT, ".mesh", "templates", "workflows", "mesh-release.yml"), "utf-8")
  );

  // Update should still patch gitignore with any required runtime ignores.
  const gitignorePath = path.join(FIXTURE_DIR, ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf-8");
  assert.ok(gitignore.includes(".mesh/local.json"), ".gitignore should retain mesh local ignore entries");

  cleanFixture();
});

// ─── Doctor tests ──────────────────────────────────────────────────────

test("cli: doctor passes on fully scaffolded project", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  const out = runCLI("doctor");

  assert.ok(out.includes("Doctor"), "should print doctor heading");
  assert.ok(out.includes("Diagnosis"), "should print diagnosis");
  assert.ok(out.includes("0 failure(s)"), "should have zero failures");
  assert.ok(
    out.includes("NOMINAL") || out.includes("INTACT"),
    "should report nominal or intact hull"
  );

  cleanFixture();
});

test("cli: doctor reports failures on empty directory", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  try {
    runCLI("doctor");
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = e.stdout || "";
    assert.ok(out.includes("✗"), "should report at least one failure");
    assert.ok(out.includes("HULL BREACH"), "should report hull breach");
  }

  cleanFixture();
});

test("cli: doctor detects version drift in agent prompt", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Tamper the agent prompt version stamp
  const agentPath = path.join(
    FIXTURE_DIR,
    ".github",
    "agents",
    "mercury-mesh.agent.md"
  );
  if (fs.existsSync(agentPath)) {
    let content = fs.readFileSync(agentPath, "utf-8");
    content = content.replace(
      /<!-- version: [\d.]+ -->/,
      "<!-- version: 0.0.0 -->"
    );
    fs.writeFileSync(agentPath, content, "utf-8");
  }

  const out = runCLI("doctor");
  assert.ok(out.includes("⚠"), "should warn about version drift");
  assert.ok(out.includes("0.0.0"), "should show the stale version");

  cleanFixture();
});

test("cli: doctor detects missing embedding API key", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Enable nervous system with openrouter but no key
  const configPath = path.join(FIXTURE_DIR, ".mesh", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  config.nervousSystem = {
    enabled: true,
    embeddingProvider: "openrouter",
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  // Clear local.json so there's no key fallback
  fs.writeFileSync(
    path.join(FIXTURE_DIR, ".mesh", "local.json"),
    "{}",
    "utf-8"
  );

  try {
    runCLI("doctor");
    // May or may not exit non-zero depending on other checks
  } catch (e) {
    const out = e.stdout || "";
    assert.ok(
      out.includes("No embedding API key"),
      "should report missing embedding API key"
    );
  }

  cleanFixture();
});

test("cli: doctor warns when team.md is missing", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  const out = runCLI("doctor");

  // team.md is optional and not created by init — should be a warning
  assert.ok(
    out.includes("Team roster") && out.includes("not found"),
    "should warn about missing team.md"
  );

  cleanFixture();
});

// ─── Status tests ──────────────────────────────────────────────────────

test("cli: status renders HUD on scaffolded project", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  const out = runCLI("status");

  assert.ok(out.includes("COMMAND BRIDGE"), "should show telemetry heading");
  assert.ok(out.includes("BRIDGE SYSTEMS"), "should show system state section");
  assert.ok(out.includes("NERVOUS SYSTEM"), "should show nervous system section");
  assert.ok(out.includes("FLIGHT LOG"), "should show sessions section");
  assert.ok(out.includes("FORMATION ROSTER"), "should show crew section");

  cleanFixture();
});

test("cli: status fails on empty directory", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  try {
    runCLI("status");
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = e.stdout || "";
    assert.ok(
      out.includes("No .mesh/config.json found"),
      "should report missing config"
    );
  }

  cleanFixture();
});

test("cli: status shows team roster counts", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Create a team.md with members
  const teamContent = `# Mercury Mesh Roster

## Bridge Control

| Name | Role | Notes |
|------|------|-------|
| Mercury Mesh | Ship's Computer | Control plane |

## Members

| Name | Role | Department | Charter | Status |
|------|------|------------|---------|--------|
| Vex | Engineer | Core | Build things | active |
| Drift | Scout | Recon | Find things | probation |
| Echo | Analyst | Intel | Read things | shadow |
`;
  fs.mkdirSync(path.join(FIXTURE_DIR, ".mesh"), { recursive: true });
  fs.writeFileSync(path.join(FIXTURE_DIR, ".mesh", "team.md"), teamContent, "utf-8");

  const out = runCLI("status");

  assert.ok(out.includes("3 Wing(s)"), "should count 3 wings");
  assert.ok(out.includes("Active") && out.includes("1"), "should show 1 active");
  assert.ok(out.includes("Probation") && out.includes("1"), "should show 1 probation");
  assert.ok(out.includes("Shadow") && out.includes("1"), "should show 1 shadow");

  cleanFixture();
});

test("cli: status reflects halted state", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Set halted = true
  const configPath = path.join(FIXTURE_DIR, ".mesh", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  config.halted = true;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  const out = runCLI("status");
  assert.ok(out.includes("ALL STOP"), "should show halted state");
  assert.ok(out.includes("HALTED"), "should show HALTED bar");

  cleanFixture();
});

test("cli: status shows pending inbox decisions", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Create decision inbox entries
  const inboxDir = path.join(FIXTURE_DIR, ".mesh", "decisions", "inbox");
  fs.mkdirSync(inboxDir, { recursive: true });
  fs.writeFileSync(path.join(inboxDir, "decision-001.md"), "# Decision 1\n", "utf-8");
  fs.writeFileSync(path.join(inboxDir, "decision-002.md"), "# Decision 2\n", "utf-8");

  const out = runCLI("status");
  assert.ok(out.includes("2 pending in inbox"), "should show 2 pending decisions");

  cleanFixture();
});

test("cli: status shows nervous system online in default light profile", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  // Adaptive config: light profile enables nervous system by default
  const out = runCLI("status");
  assert.ok(out.includes("ONLINE"), "light profile should enable nervous system");

  cleanFixture();
});

test("cli: usage includes status command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("status"), "usage should mention status");
  assert.ok(out.includes("Bridge telemetry") || out.includes("COMMAND BRIDGE"), "usage should describe status");
});

test("cli: vanguard outrider dismiss updates candidate state", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  const mapPath = path.join(FIXTURE_DIR, ".mesh", "vanguard", "outrider", "adjacency-map.json");
  fs.mkdirSync(path.dirname(mapPath), { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify({
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [{ id: "adj-cli-1", domain: ["test"], score: 0.5, status: "discovered" }],
  }, null, 2), "utf-8");

  const out = runCLI("vanguard", "outrider", "dismiss", "adj-cli-1");
  assert.ok(out.includes("DISMISSED"));

  const updated = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  assert.equal(updated.candidates[0].status, "dismissed");

  cleanFixture();
});

test("cli: vanguard horizon authorize activates speculative sortie experiment", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  const horizon = require("../.mesh/nervous-system/vanguard/horizon-deck.js");
  const sortieMod = require("../.mesh/nervous-system/vanguard/speculative-sortie.js");
  const outrider = require("../.mesh/nervous-system/vanguard/outrider.js");
  const meshDir = path.join(FIXTURE_DIR, ".mesh");

  outrider.saveAdjacencyMap(meshDir, {
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [{ id: "adj-cli-sortie", domain: ["graphql"], score: 0.72, status: "discovered", promotedToExperiment: null }],
  });

  const sortie = sortieMod.draftSortie({ id: "adj-cli-sortie", domain: ["graphql"], score: 0.72 });
  const sortieDir = path.join(meshDir, "vanguard", "speculative-sorties");
  fs.mkdirSync(sortieDir, { recursive: true });
  fs.writeFileSync(path.join(sortieDir, `${sortie.id}.json`), JSON.stringify(sortie, null, 2) + "\n", "utf-8");

  const staged = horizon.stageItem(meshDir, {
    type: "speculative-sortie",
    title: sortie.title,
    proposalRef: sortie.id,
    proposalData: sortie,
  });

  const out = runCLI("vanguard", "horizon", "authorize", staged.item.id, "--notes", "launch it");
  assert.ok(out.includes("AUTHORIZED"));
  assert.ok(out.includes("Experiment"));

  const updatedSortie = JSON.parse(fs.readFileSync(path.join(sortieDir, `${sortie.id}.json`), "utf-8"));
  assert.equal(updatedSortie.status, "active");
  assert.ok(updatedSortie.experimentId);

  cleanFixture();
});

test("cli: vanguard genesis integrate installs authorized proposal", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  const skunkworks = require("../.mesh/nervous-system/vanguard/skunkworks.js");
  const genesis = require("../.mesh/nervous-system/vanguard/genesis-protocols.js");
  const skillSynth = require("../.mesh/nervous-system/vanguard/skill-synthesis.js");
  const meshDir = path.join(FIXTURE_DIR, ".mesh");

  const draft = skunkworks.draftExperiment(meshDir, {
    title: "CLI Genesis",
    hypothesis: "Integration works",
    domain: ["graphql"],
    successCriteria: ["Done"],
  });
  skunkworks.activateExperiment(meshDir, draft.experiment.id);
  skunkworks.reviewExperiment(meshDir, draft.experiment.id, {
    criteriaResults: [{ criterion: "Done", met: true, evidence: "ok" }],
  });
  skunkworks.promoteExperiment(meshDir, draft.experiment.id);

  const skillDraft = skillSynth.synthesizeSkill({
    name: "CLI Genesis Skill",
    description: "test",
    domain: "graphql",
    experimentId: draft.experiment.id,
  });
  skillSynth.writeSkillDraft(meshDir, draft.experiment.id, skillDraft, true);

  const staged = genesis.generateAndStageProposal(meshDir, draft.experiment.id);
  genesis.authorizeProposal(meshDir, staged.proposal.id, "commander");

  const out = runCLI("vanguard", "genesis", "integrate", staged.proposal.id);
  assert.ok(out.includes("INTEGRATED"));

  const structure = JSON.parse(fs.readFileSync(path.join(meshDir, "org", "structure.json"), "utf-8"));
  assert.ok(structure.departments.some((dept) => dept.genesisOrigin === staged.proposal.id));

  cleanFixture();
});

// ─── Create-skill tests ───────────────────────────────────────────────

test("cli: create-skill scaffolds SKILL.md in both directories", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  const out = runCLI("create-skill", "my-test-skill", "--description", "A test skill", "--domain", "testing");

  assert.ok(out.includes("Create Skill"), "should print heading");
  assert.ok(out.includes("my-test-skill"), "should mention skill name");

  // Live skill
  const livePath = path.join(FIXTURE_DIR, ".copilot", "skills", "my-test-skill", "SKILL.md");
  assert.ok(fs.existsSync(livePath), "live SKILL.md should exist");

  const content = fs.readFileSync(livePath, "utf-8");
  assert.ok(content.includes('name: "my-test-skill"'), "should have correct name in frontmatter");
  assert.ok(content.includes('description: "A test skill"'), "should have description");
  assert.ok(content.includes('domain: "testing"'), "should have domain");
  assert.ok(content.includes("## Patterns"), "should have Patterns section");
  assert.ok(content.includes("## Anti-Patterns"), "should have Anti-Patterns section");

  // Template mirror — only present if .mesh/templates/skills/ exists in target
  const templateSkillsBase = path.join(FIXTURE_DIR, ".mesh", "templates", "skills");
  const templatePath = path.join(templateSkillsBase, "my-test-skill", "SKILL.md");
  if (fs.existsSync(templateSkillsBase)) {
    assert.ok(fs.existsSync(templatePath), "template SKILL.md should exist when templates dir is present");
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    assert.equal(content, templateContent, "live and template should be identical");
  }

  cleanFixture();
});

test("cli: create-skill mirrors to templates when templates dir exists", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  // Create the templates/skills directory to simulate a dev/contributor environment
  const templateSkillsDir = path.join(FIXTURE_DIR, ".mesh", "templates", "skills");
  fs.mkdirSync(templateSkillsDir, { recursive: true });

  runCLI("create-skill", "synced-skill", "--description", "Sync test");

  const livePath = path.join(FIXTURE_DIR, ".copilot", "skills", "synced-skill", "SKILL.md");
  const templatePath = path.join(templateSkillsDir, "synced-skill", "SKILL.md");

  assert.ok(fs.existsSync(livePath), "live SKILL.md should exist");
  assert.ok(fs.existsSync(templatePath), "template SKILL.md should exist");

  const liveContent = fs.readFileSync(livePath, "utf-8");
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  assert.equal(liveContent, templateContent, "live and template should be identical");

  cleanFixture();
});

test("cli: create-skill rejects duplicate skill name", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  runCLI("create-skill", "unique-skill");

  // Second creation of same name should fail
  try {
    runCLI("create-skill", "unique-skill");
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = (e.stderr || "") + (e.stdout || "");
    assert.ok(out.includes("already exists"), "should report skill already exists");
  }

  cleanFixture();
});

test("cli: create-skill slugifies name", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");
  runCLI("create-skill", "My Cool Skill!");

  const livePath = path.join(FIXTURE_DIR, ".copilot", "skills", "my-cool-skill", "SKILL.md");
  assert.ok(fs.existsSync(livePath), "should slugify to my-cool-skill");

  cleanFixture();
});

test("cli: create-skill fails without name argument", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  runCLI("init");

  try {
    runCLI("create-skill");
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = (e.stderr || "") + (e.stdout || "");
    assert.ok(out.includes("Usage:"), "should print usage hint");
  }

  cleanFixture();
});

// ── Resume ──────────────────────────────────────────────────────

test("cli: resume shows briefing with session data", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const sessDir = path.join(FIXTURE_DIR, ".mesh", "sessions");
  fs.mkdirSync(sessDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessDir, "test-session.json"),
    JSON.stringify({
      id: "test-session",
      createdAt: "2025-01-01T10:00:00Z",
      lastActiveAt: "2025-01-01T11:30:00Z",
      messages: [
        { role: "agent", agentName: "Scribe", content: "Started documentation pass.", timestamp: "2025-01-01T10:05:00Z" },
        { role: "agent", agentName: "Navigator", content: "Route planned for auth module.", timestamp: "2025-01-01T11:30:00Z" },
      ],
    })
  );

  const out = runCLI("resume", "--target", FIXTURE_DIR);
  assert.ok(out.includes("Resume"), "should print resume heading");
  assert.ok(out.includes("test-session"), "should show session id");
  assert.ok(out.includes("SESSION"), "should have SESSION section");
  assert.ok(out.includes("LAST KNOWN TRAJECTORY"), "should have LAST KNOWN TRAJECTORY section");
  assert.ok(out.includes("UNFINISHED BUSINESS"), "should have UNFINISHED BUSINESS section");

  cleanFixture();
});

test("cli: resume fails gracefully with no sessions", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  try {
    runCLI("resume", "--target", FIXTURE_DIR);
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = (e.stderr || "") + (e.stdout || "");
    assert.ok(out.includes("No sessions found"), "should report no sessions");
  }

  cleanFixture();
});

test("cli: resume shows pending decisions", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  // Create session
  const sessDir = path.join(FIXTURE_DIR, ".mesh", "sessions");
  fs.mkdirSync(sessDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessDir, "pending-sess.json"),
    JSON.stringify({
      id: "pending-sess",
      createdAt: "2025-01-01T10:00:00Z",
      lastActiveAt: "2025-01-01T10:30:00Z",
      messages: [{ role: "agent", agentName: "Navigator", content: "Work in progress." }],
    })
  );

  // Create inbox decision
  const inboxDir = path.join(FIXTURE_DIR, ".mesh", "decisions", "inbox");
  fs.mkdirSync(inboxDir, { recursive: true });
  fs.writeFileSync(path.join(inboxDir, "decision-001.md"), "# Decide architecture\n");

  const out = runCLI("resume", "--target", FIXTURE_DIR);
  assert.ok(out.includes("1 pending"), "should show pending decision count");

  cleanFixture();
});

test("cli: resume --session selects specific session", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const sessDir = path.join(FIXTURE_DIR, ".mesh", "sessions");
  fs.mkdirSync(sessDir, { recursive: true });

  // Create two sessions
  fs.writeFileSync(
    path.join(sessDir, "sess-alpha.json"),
    JSON.stringify({
      id: "sess-alpha",
      createdAt: "2025-01-01T08:00:00Z",
      lastActiveAt: "2025-01-01T09:00:00Z",
      messages: [{ role: "agent", agentName: "Scribe", content: "Alpha session work." }],
    })
  );
  fs.writeFileSync(
    path.join(sessDir, "sess-beta.json"),
    JSON.stringify({
      id: "sess-beta",
      createdAt: "2025-01-01T10:00:00Z",
      lastActiveAt: "2025-01-01T11:00:00Z",
      messages: [{ role: "agent", agentName: "Navigator", content: "Beta session work." }],
    })
  );

  // Default should pick beta (most recent)
  const outDefault = runCLI("resume", "--target", FIXTURE_DIR);
  assert.ok(outDefault.includes("sess-beta"), "default should pick most recent session");

  // Explicit --session should pick alpha
  const outAlpha = runCLI("resume", "--session", "sess-alpha", "--target", FIXTURE_DIR);
  assert.ok(outAlpha.includes("sess-alpha"), "should show requested session");

  cleanFixture();
});

test("cli: resume --session rejects unknown session id", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const sessDir = path.join(FIXTURE_DIR, ".mesh", "sessions");
  fs.mkdirSync(sessDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessDir, "real-sess.json"),
    JSON.stringify({
      id: "real-sess",
      createdAt: "2025-01-01T10:00:00Z",
      messages: [],
    })
  );

  try {
    runCLI("resume", "--session", "nonexistent", "--target", FIXTURE_DIR);
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = (e.stderr || "") + (e.stdout || "");
    assert.ok(out.includes("not found"), "should report session not found");
  }

  cleanFixture();
});

// ── Eject ───────────────────────────────────────────────────────

test("cli: eject removes .mesh/ and mesh artifacts", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  // Verify scaffolded state
  assert.ok(fs.existsSync(path.join(FIXTURE_DIR, ".mesh")), ".mesh should exist before eject");
  assert.ok(fs.existsSync(path.join(FIXTURE_DIR, ".copilot", "skills")), ".copilot/skills should exist before eject");
  assert.ok(fs.existsSync(path.join(FIXTURE_DIR, ".github", "agents", "mercury-mesh.agent.md")), "agent should exist before eject");

  const out = runCLI("eject", "--target", FIXTURE_DIR);
  assert.ok(out.includes("Eject"), "should print eject heading");
  assert.ok(out.includes("Ejected"), "should print eject summary");

  // Verify removal
  assert.ok(!fs.existsSync(path.join(FIXTURE_DIR, ".mesh")), ".mesh/ should be removed");
  assert.ok(!fs.existsSync(path.join(FIXTURE_DIR, ".copilot", "skills")), ".copilot/skills/ should be removed");
  assert.ok(!fs.existsSync(path.join(FIXTURE_DIR, ".github", "agents", "mercury-mesh.agent.md")), "agent should be removed");
  assert.ok(!fs.existsSync(path.join(FIXTURE_DIR, ".github", "copilot-instructions.md")), "copilot-instructions should be removed");

  cleanFixture();
});

test("cli: eject fails on project without .mesh/", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  try {
    runCLI("eject", "--target", FIXTURE_DIR);
    assert.fail("should have exited with non-zero");
  } catch (e) {
    const out = (e.stderr || "") + (e.stdout || "");
    assert.ok(out.includes("Nothing to eject"), "should report nothing to eject");
  }

  cleanFixture();
});

test("cli: eject preserves mcp-config.json", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const mcpPath = path.join(FIXTURE_DIR, ".copilot", "mcp-config.json");
  assert.ok(fs.existsSync(mcpPath), "mcp-config.json should exist before eject");

  runCLI("eject", "--target", FIXTURE_DIR);

  assert.ok(fs.existsSync(mcpPath), "mcp-config.json should be preserved after eject");

  cleanFixture();
});

test("cli: eject removes mesh workflow files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const wfDir = path.join(FIXTURE_DIR, ".github", "workflows");
  assert.ok(fs.existsSync(path.join(wfDir, "mesh-ci.yml")), "mesh-ci.yml should exist before eject");

  runCLI("eject", "--target", FIXTURE_DIR);

  assert.ok(!fs.existsSync(path.join(wfDir, "mesh-ci.yml")), "mesh-ci.yml should be removed after eject");
  assert.ok(!fs.existsSync(path.join(wfDir, "mesh-triage.yml")), "mesh-triage.yml should be removed after eject");

  cleanFixture();
});

test("cli: eject cleans gitignore mesh entries", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init");

  const gitignorePath = path.join(FIXTURE_DIR, ".gitignore");
  // Add a user line before init's mesh lines
  const before = fs.readFileSync(gitignorePath, "utf-8");
  fs.writeFileSync(gitignorePath, "node_modules/\n" + before);

  runCLI("eject", "--target", FIXTURE_DIR);

  const after = fs.readFileSync(gitignorePath, "utf-8");
  assert.ok(after.includes("node_modules/"), "should preserve user gitignore entries");
  assert.ok(!after.includes(".mesh/orchestration-log/"), "should remove mesh gitignore entries");
  assert.ok(!after.includes("Mercury Mesh:"), "should remove mesh comment line");

  cleanFixture();
});

test("cli: usage includes eject command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("eject"), "usage should mention eject");
});

// ── Worktree ────────────────────────────────────────────────────

test("cli: worktree list in a git repo shows worktrees", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  // Init a git repo in the fixture
  execFileSync("git", ["init"], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init", "--allow-empty"], {
    cwd: FIXTURE_DIR,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "t@t" },
  });

  const out = runCLI("worktree", "list", "--target", FIXTURE_DIR);
  assert.ok(out.includes("Worktree"), "should print worktree heading");
  assert.ok(out.includes("Git worktrees:"), "should show worktree count");

  cleanFixture();
});

test("cli: worktree status on initialized mesh project", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  execFileSync("git", ["init"], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init", "--allow-empty"], {
    cwd: FIXTURE_DIR,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "t@t" },
  });

  const out = runCLI("worktree", "status", "--target", FIXTURE_DIR);
  assert.ok(out.includes("WORKTREE FORMATION HEALTH"), "should print health report");
  assert.ok(out.includes("Healthy"), "should show healthy count");

  cleanFixture();
});

test("cli: worktree prune with no orphans reports clean", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  execFileSync("git", ["init"], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init", "--allow-empty"], {
    cwd: FIXTURE_DIR,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "t@t" },
  });

  const out = runCLI("worktree", "prune", "--target", FIXTURE_DIR);
  assert.ok(out.includes("No orphaned"), "should report no orphans");

  cleanFixture();
});

test("cli: worktree on non-git directory fails gracefully", () => {
  // Use a temp dir guaranteed to be outside any git repo
  const os = require("os");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-wt-test-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      cwd: tmpDir,
      encoding: "utf-8",
    });
    execFileSync(process.execPath, [CLI_PATH, "worktree", "list", "--target", tmpDir], {
      cwd: tmpDir,
      encoding: "utf-8",
    });
    assert.fail("should have thrown");
  } catch (err) {
    if (err.code === "ERR_ASSERTION") throw err;
    const out = err.stdout || (err.output && err.output[1]) || String(err);
    assert.ok(out.includes("Not a git repository"), "should report not a git repo");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  cleanFixture();
});

test("cli: worktree unknown subcommand shows available options", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  execFileSync("git", ["init"], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: FIXTURE_DIR, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init", "--allow-empty"], {
    cwd: FIXTURE_DIR,
    stdio: "ignore",
    env: { ...process.env, GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "t@t" },
  });

  try {
    runCLI("worktree", "bogus", "--target", FIXTURE_DIR);
    assert.fail("should have thrown");
  } catch (err) {
    const out = err.stderr || err.stdout || String(err);
    assert.ok(out.includes("Unknown subcommand"), "should report unknown subcommand");
    assert.ok(out.includes("list, status, prune"), "should list available subcommands");
  }

  cleanFixture();
});

test("cli: usage includes worktree command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("worktree"), "usage should mention worktree");
});

// ── Coalescence ─────────────────────────────────────────────────────

function scaffoldGhosts(fixtureDir, ghosts) {
  const orgDir = path.join(fixtureDir, ".mesh", "org");
  fs.mkdirSync(orgDir, { recursive: true });

  const structure = { departments: [], crossDepartment: { strategy: "contract-first" } };

  for (const g of ghosts) {
    const ghostDir = path.join(orgDir, g.id);
    fs.mkdirSync(ghostDir, { recursive: true });

    structure.departments.push({
      id: g.id,
      name: g.name,
      domain: g.domain,
      routingKeywords: g.routingKeywords || g.domain,
      _ghost: true,
      _synthesizedAt: new Date().toISOString(),
    });

    fs.writeFileSync(
      path.join(ghostDir, "ghost-meta.json"),
      JSON.stringify({
        partialAttractors: g.partialAttractors || [],
        solidificationThreshold: 3,
        dissolutionThreshold: 2,
        successCount: g.successCount || 0,
        failureCount: 0,
        maxLifespanHours: 72,
      }, null, 2) + "\n"
    );

    fs.writeFileSync(
      path.join(ghostDir, "backlog.md"),
      `# ${g.name} — Backlog\n\n| ID | Title | Status |\n| --- | --- | --- |\n${g.backlogContent || ""}\n`
    );
  }

  fs.writeFileSync(
    path.join(orgDir, "structure.json"),
    JSON.stringify(structure, null, 2) + "\n"
  );
}

test("cli: coalescence scan with no ghost wings", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  const out = runCLI("coalescence", "scan", "--target", FIXTURE_DIR);
  assert.ok(out.includes("Coalescence"), "should print coalescence heading");
  assert.ok(out.includes("Active ghosts"), "should show ghost count");
  assert.ok(out.includes("at least 2"), "should note need for 2+ ghosts");

  cleanFixture();
});

test("cli: coalescence scan detects overlapping ghost wings", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  scaffoldGhosts(FIXTURE_DIR, [
    { id: "ghost-aaa", name: "Auth Wing", domain: ["auth", "login", "session", "token", "security"], backlogContent: "| g-001 | Fix src/auth/login.js | queued |" },
    { id: "ghost-bbb", name: "Security Wing", domain: ["auth", "login", "session", "token", "access"], backlogContent: "| g-002 | Update src/auth/session.js | queued |" },
    { id: "ghost-ccc", name: "Logging Wing", domain: ["logging", "metrics", "observability", "trace", "spans"] },
  ]);

  const out = runCLI("coalescence", "scan", "--target", FIXTURE_DIR);
  assert.ok(out.includes("Overlaps found"), "should report overlaps");
  assert.ok(out.includes("Auth Wing") || out.includes("ghost-aaa"), "should name wing A");
  assert.ok(out.includes("Security Wing") || out.includes("ghost-bbb"), "should name wing B");

  cleanFixture();
});

test("cli: coalescence apply merges overlapping ghosts", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  // Create two nearly identical Ghost Wings that will auto-coalesce
  scaffoldGhosts(FIXTURE_DIR, [
    {
      id: "ghost-aaa",
      name: "Auth Wing",
      domain: ["auth", "login", "session", "token", "security"],
      routingKeywords: ["auth", "login", "session", "token", "security"],
      successCount: 2,
      backlogContent: "| g-001 | Fix src/auth/login.js | queued |",
    },
    {
      id: "ghost-bbb",
      name: "Auth2 Wing",
      domain: ["auth", "login", "session", "token", "security"],
      routingKeywords: ["auth", "login", "session", "token", "security"],
      successCount: 1,
      backlogContent: "| g-002 | Fix src/auth/login.js | queued |",
    },
  ]);

  const out = runCLI("coalescence", "apply", "--target", FIXTURE_DIR);
  assert.ok(out.includes("COALESCENCE APPLIED"), "should print applied heading");

  // Verify merged: survivor should still exist, absorbed should not
  const structurePath = path.join(FIXTURE_DIR, ".mesh", "org", "structure.json");
  const structure = JSON.parse(fs.readFileSync(structurePath, "utf-8"));
  const ghostIds = structure.departments.map((d) => d.id);
  assert.equal(ghostIds.length, 1, "should have 1 department after coalescence");

  cleanFixture();
});

test("cli: coalescence on empty project fails gracefully", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  try {
    runCLI("coalescence", "scan", "--target", FIXTURE_DIR);
    assert.fail("should have thrown");
  } catch (err) {
    const out = err.stdout || (err.output && err.output[1]) || String(err);
    assert.ok(out.includes("No .mesh/"), "should report missing .mesh");
  }

  cleanFixture();
});

test("cli: coalescence unknown subcommand shows available options", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  try {
    runCLI("coalescence", "bogus", "--target", FIXTURE_DIR);
    assert.fail("should have thrown");
  } catch (err) {
    const out = err.stdout || (err.output && err.output[1]) || String(err);
    assert.ok(out.includes("Unknown subcommand"), "should report unknown subcommand");
    assert.ok(out.includes("scan, apply"), "should list available subcommands");
  }

  cleanFixture();
});

test("cli: usage includes coalescence command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("coalescence"), "usage should mention coalescence");
});

// ── Peers CLI tests ─────────────────────────────────────────────────────

test("cli: peers list on empty registry", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  const out = runCLI("peers", "list", "--target", FIXTURE_DIR);
  assert.ok(out.includes("No peers") || out.includes("0 peer"), "should indicate empty peer registry");

  cleanFixture();
});

test("cli: peers register creates node manifest", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  const out = runCLI("peers", "register", "--target", FIXTURE_DIR);
  assert.ok(out.toLowerCase().includes("registered"), "should confirm registration");

  // Verify peer file was created
  const peersDir = path.join(FIXTURE_DIR, ".mesh", "peers");
  assert.ok(fs.existsSync(peersDir), "peers directory should exist");
  const files = fs.readdirSync(peersDir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 1, "should have at least one peer manifest");

  cleanFixture();
});

test("cli: peers register with alias", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  const out = runCLI("peers", "register", "--alias", "my-node", "--target", FIXTURE_DIR);
  assert.ok(out.includes("my-node") || out.includes("Registered"), "should show alias or confirm");

  cleanFixture();
});

test("cli: peers health shows fleet health", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  // Register first so there's at least one peer
  runCLI("peers", "register", "--target", FIXTURE_DIR);
  const out = runCLI("peers", "health", "--target", FIXTURE_DIR);
  assert.ok(out.toLowerCase().includes("health") || out.includes("Fleet") || out.includes("%"), "should show health report");

  cleanFixture();
});

test("cli: peers on empty project fails gracefully", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  try {
    runCLI("peers", "list", "--target", FIXTURE_DIR);
    assert.fail("should have thrown");
  } catch (err) {
    const out = err.stdout || (err.output && err.output[1]) || String(err);
    assert.ok(out.includes("not found") || out.includes("No .mesh") || out.includes("Error") || out.includes("error"),
      "should indicate missing .mesh");
  }

  cleanFixture();
});

test("cli: peers unknown subcommand shows options", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  runCLI("init", "--target", FIXTURE_DIR);

  try {
    runCLI("peers", "bogus", "--target", FIXTURE_DIR);
    assert.fail("should have thrown");
  } catch (err) {
    const out = err.stdout || (err.output && err.output[1]) || String(err);
    assert.ok(out.includes("Unknown") || out.includes("unknown") || out.includes("list, register"),
      "should report unknown subcommand or list options");
  }

  cleanFixture();
});

test("cli: usage includes peers command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("peers"), "usage should mention peers");
});
