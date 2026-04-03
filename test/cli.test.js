const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

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
    env: { ...process.env },
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
  });
  assert.ok(out.includes("Usage:"));
});

test("cli: init scaffolds expected files", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const out = runCLI("init");
  assert.ok(out.includes("Init complete"));

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

  // Config
  assert.ok(
    fs.existsSync(path.join(FIXTURE_DIR, ".mesh", "config.json")),
    "config.json missing"
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
  assert.ok(out.includes("Init complete"));

  cleanFixture();
});

test("cli: update only touches agent + skills + instructions", () => {
  cleanFixture();
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // Init first
  runCLI("init");

  // Modify config (should survive update)
  const configPath = path.join(FIXTURE_DIR, ".mesh", "config.json");
  const original = fs.readFileSync(configPath, "utf-8");
  fs.writeFileSync(configPath, original.replace('"version": 2', '"version": 888'));

  // Update
  const out = runCLI("update");
  assert.ok(out.includes("Update complete"));

  // Config should NOT have been touched
  const after = fs.readFileSync(configPath, "utf-8");
  assert.ok(after.includes('"version": 888'), "config was overwritten by update");

  // Agent prompt should have been refreshed
  assert.ok(
    fs.existsSync(
      path.join(FIXTURE_DIR, ".github", "agents", "mercury-mesh.agent.md")
    )
  );

  cleanFixture();
});
