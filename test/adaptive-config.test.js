const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const { detectRepoComplexity } = require("../lib/complexity-scanner.cjs");
const {
  resolveRecommendedProfile,
  buildConfig,
  formatRecommendationSummary,
  PROFILES,
  PROFILE_LABELS,
} = require("../lib/profile-resolver.cjs");

const FIXTURE_DIR = path.join(__dirname, "fixture");
const CLI_PATH = path.resolve(__dirname, "..", "bin", "mercury-mesh.cjs");

/**
 * Recursively copy a fixture directory into a target directory.
 */
function copyFixture(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFixture(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Complexity Scanner Tests ──────────────────────────────────────────

test("scanner: light repo resolves to light", () => {
  const result = detectRepoComplexity(path.join(FIXTURE_DIR, "repo-light"));
  assert.equal(result.profile, "light");
  assert.ok(["low", "medium", "high"].includes(result.confidence));
  assert.equal(typeof result.signals, "object");
  assert.ok(Array.isArray(result.reasons));
  assert.equal(result.signals.monorepo, false);
});

test("scanner: medium repo resolves to medium", () => {
  const result = detectRepoComplexity(path.join(FIXTURE_DIR, "repo-medium"));
  assert.equal(result.profile, "medium");
  assert.equal(result.signals.monorepo, false);
  assert.equal(result.signals.deploymentRisk, true, "CI workflows should be detected");
  assert.ok(result.signals.languageCount >= 2, "should detect JS + Python");
});

test("scanner: heavy repo resolves to heavy", () => {
  const result = detectRepoComplexity(path.join(FIXTURE_DIR, "repo-heavy"));
  assert.equal(result.profile, "heavy");
  assert.equal(result.signals.monorepo, true, "workspaces should trigger monorepo");
  assert.equal(result.signals.infraPresent, true, "terraform dir should be detected");
  assert.equal(result.signals.deploymentRisk, true, "CI workflows should be detected");
  assert.ok(result.signals.languageCount >= 3, "should detect JS + TS + Python");
});

test("scanner: experimental repo resolves to experimental", () => {
  const result = detectRepoComplexity(path.join(FIXTURE_DIR, "repo-experimental"));
  assert.equal(result.profile, "experimental");
  assert.ok(result.reasons.some((r) => r.includes("R&D") || r.includes("experimental")));
});

test("scanner: returns structured signal object", () => {
  const result = detectRepoComplexity(path.join(FIXTURE_DIR, "repo-light"));
  const keys = Object.keys(result.signals);
  assert.ok(keys.includes("monorepo"));
  assert.ok(keys.includes("languageCount"));
  assert.ok(keys.includes("deploymentRisk"));
  assert.ok(keys.includes("infraPresent"));
  assert.ok(keys.includes("fileCount"));
  assert.ok(keys.includes("parallelismIndicators"));
});

test("scanner: empty directory resolves to light", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-scan-empty-"));
  try {
    const result = detectRepoComplexity(tmpDir);
    assert.equal(result.profile, "light");
    assert.ok(result.reasons.length > 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Profile Resolver Tests ────────────────────────────────────────────

test("resolver: light scan maps to light profile config", () => {
  const scan = { profile: "light", confidence: "low", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  assert.equal(resolved.profile, "light");
  assert.equal(resolved.label, PROFILE_LABELS.light);
  assert.equal(resolved.config.orgMode, false);
  assert.equal(resolved.config.nervousSystem.enabled, true);
  assert.equal(resolved.config.ghostWings.enabled, true);
  assert.equal(resolved.config.ghostWings.autoMaterialize, false);
  assert.equal(resolved.config.vanguard.enabled, false);
});

test("resolver: medium scan maps to medium profile config", () => {
  const scan = { profile: "medium", confidence: "medium", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  assert.equal(resolved.profile, "medium");
  assert.equal(resolved.config.orgMode, true);
  assert.equal(resolved.config.nervousSystem.enabled, true);
  assert.equal(resolved.config.vanguard.enabled, false);
});

test("resolver: heavy scan maps to heavy profile config", () => {
  const scan = { profile: "heavy", confidence: "high", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  assert.equal(resolved.profile, "heavy");
  assert.equal(resolved.config.orgMode, true);
  assert.ok(resolved.config.orgConfig, "heavy profile should include orgConfig");
  assert.equal(resolved.config.orgConfig.maxParallelismPerDepartment, 3);
});

test("resolver: experimental scan maps to experimental profile config", () => {
  const scan = { profile: "experimental", confidence: "medium", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  assert.equal(resolved.profile, "experimental");
  assert.equal(resolved.config.orgMode, true);
  assert.equal(resolved.config.vanguard.enabled, false, "vanguard must stay off even in experimental");
});

test("resolver: highImpactOverrides identifies orgMode diff from conservative", () => {
  const scan = { profile: "medium", confidence: "medium", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  const orgOverride = resolved.highImpactOverrides.find((o) => o.key === "orgMode");
  assert.ok(orgOverride, "orgMode should be in highImpactOverrides for medium");
  assert.equal(orgOverride.recommended, true);
  assert.equal(orgOverride.conservative, false);
});

test("resolver: vanguard never appears as auto-enabled override", () => {
  for (const band of ["light", "medium", "heavy", "experimental"]) {
    const scan = { profile: band, confidence: "high", signals: {}, reasons: [] };
    const resolved = resolveRecommendedProfile(scan);
    const vOverride = resolved.highImpactOverrides.find((o) => o.key === "vanguard.enabled");
    assert.ok(!vOverride, `vanguard should not be in overrides for ${band}`);
  }
});

// ─── buildConfig Tests ─────────────────────────────────────────────────

test("buildConfig: produces valid config from accepted profile", () => {
  const scan = { profile: "medium", confidence: "medium", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  const config = buildConfig(resolved);

  assert.equal(config.version, 2);
  assert.equal(config.halted, false);
  assert.ok(Array.isArray(config.allowedModels));
  assert.equal(config.orgMode, true);
  assert.equal(config.nervousSystem.enabled, true);
  assert.equal(config.vanguard.enabled, false);
  assert.ok(config.humanTiers);
  assert.ok(config.modelRouting);
});

test("buildConfig: conservative overrides disable everything", () => {
  const scan = { profile: "heavy", confidence: "high", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  const config = buildConfig(resolved, {
    orgMode: false,
    nervousSystem: false,
    vanguard: false,
    autoMaterialize: false,
  });

  assert.equal(config.orgMode, false);
  assert.equal(config.nervousSystem.enabled, false);
  assert.equal(config.vanguard.enabled, false);
});

test("buildConfig: Commander can enable vanguard via override", () => {
  const scan = { profile: "medium", confidence: "medium", signals: {}, reasons: [] };
  const resolved = resolveRecommendedProfile(scan);
  const config = buildConfig(resolved, { vanguard: true });
  assert.equal(config.vanguard.enabled, true);
});

// ─── formatRecommendationSummary Tests ─────────────────────────────────

test("formatRecommendationSummary: includes profile and posture", () => {
  const scan = { profile: "medium", confidence: "high", signals: {}, reasons: ["CI detected"] };
  const resolved = resolveRecommendedProfile(scan);
  const summary = formatRecommendationSummary(scan, resolved);

  assert.ok(summary.includes("HULL PROFILE DETECTED"));
  assert.ok(summary.includes("MEDIUM TEAM REPOSITORY"));
  assert.ok(summary.includes("HIGH"));
  assert.ok(summary.includes("RECOMMENDED POSTURE"));
  assert.ok(summary.includes("orgMode"));
  assert.ok(summary.includes("SIGNALS"));
  assert.ok(summary.includes("CI detected"));
});

// ─── CLI Integration: init with adaptive config ────────────────────────

test("cli: init on non-TTY produces config with conservative/light defaults", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-init-adapt-"));
  try {
    const out = execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("Init complete"));
    assert.ok(out.includes("HULL PROFILE DETECTED"), "should display hull profile");

    const configPath = path.join(tmpDir, ".mesh", "config.json");
    assert.ok(fs.existsSync(configPath), "config.json should be created");

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    assert.equal(config.version, 2);
    assert.equal(config.halted, false);
    // Non-TTY should accept the recommended profile (light for empty dir)
    assert.equal(typeof config.orgMode, "boolean");
    assert.equal(typeof config.nervousSystem.enabled, "boolean");
    assert.equal(config.vanguard.enabled, false, "vanguard must never auto-enable");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: init does not overwrite existing config with adaptive flow", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-init-noover-"));
  try {
    // First init
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    // Modify config
    const configPath = path.join(tmpDir, ".mesh", "config.json");
    const original = fs.readFileSync(configPath, "utf-8");
    fs.writeFileSync(configPath, original.replace('"version": 2', '"version": 777'));

    // Second init
    const out = execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("skip"));

    const after = fs.readFileSync(configPath, "utf-8");
    assert.ok(after.includes('"version": 777'), "config was overwritten without --force");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Safety Tests ──────────────────────────────────────────────────────

test("safety: autoMaterialize is never true in any default profile", () => {
  for (const [name, profile] of Object.entries(PROFILES)) {
    assert.equal(
      profile.ghostWings.autoMaterialize,
      false,
      `autoMaterialize must be false in ${name} profile`
    );
  }
});

test("safety: vanguard is never enabled in any default profile", () => {
  for (const [name, profile] of Object.entries(PROFILES)) {
    assert.equal(
      profile.vanguard.enabled,
      false,
      `vanguard must be disabled in ${name} profile`
    );
  }
});

// ─── Doctor Posture Advisory Tests ─────────────────────────────────────

test("cli: doctor emits CFG-101 when medium repo has orgMode off", () => {
  // Scaffold a medium-complexity repo, then force orgMode off
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-doc-101-"));
  try {
    // Copy medium fixture structure
    copyFixture(path.join(FIXTURE_DIR, "repo-medium"), tmpDir);

    // Init to get a scaffolded project
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    // Force orgMode off even though this is a medium hull
    const configPath = path.join(tmpDir, ".mesh", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.orgMode = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    const out = execFileSync(process.execPath, [CLI_PATH, "doctor", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("CFG-101"), "doctor should emit CFG-101 for orgMode mismatch");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: doctor emits CFG-103 when autoMaterialize on without Tier-1", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-doc-103-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const configPath = path.join(tmpDir, ".mesh", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.nervousSystem.ghostWings = { autoMaterialize: true };
    config.humanTiers = { tier1: [], tier2: [], tier3: [] };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    const out = execFileSync(process.execPath, [CLI_PATH, "doctor", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("CFG-103"), "doctor should emit CFG-103 for autoMaterialize without Tier-1");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: doctor emits CFG-301 when vanguard on without Tier-1", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-doc-301-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const configPath = path.join(tmpDir, ".mesh", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.vanguard = { enabled: true };
    config.humanTiers = { tier1: [], tier2: [], tier3: [] };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    const out = execFileSync(process.execPath, [CLI_PATH, "doctor", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("CFG-301"), "doctor should emit CFG-301 for vanguard without Tier-1");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: doctor shows posture aligned when config matches profile", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-doc-aligned-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const out = execFileSync(process.execPath, [CLI_PATH, "doctor", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("Posture Advisory"), "doctor should have posture advisory section");
    // For a light profile with orgMode off, posture should be aligned
    assert.ok(out.includes("aligned") || out.includes("Org posture"), "doctor should show posture alignment");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Config Recommend Tests ────────────────────────────────────────────

test("cli: config recommend shows hull profile on scaffolded project", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-rec-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const out = execFileSync(process.execPath, [CLI_PATH, "config", "recommend", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("HULL PROFILE DETECTED"), "should show hull profile");
    assert.ok(out.includes("Config Recommend"), "should have Config Recommend heading");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config recommend --json outputs machine-readable data", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-json-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const out = execFileSync(process.execPath, [CLI_PATH, "config", "recommend", "--json", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    // Extract JSON from output (it appears after the CLI chrome)
    const jsonStart = out.indexOf("{");
    assert.ok(jsonStart >= 0, "should contain JSON output");
    const json = JSON.parse(out.slice(jsonStart));
    assert.ok(json.profile, "JSON should have profile");
    assert.ok(json.confidence, "JSON should have confidence");
    assert.ok(json.signals, "JSON should have signals");
    assert.ok(Array.isArray(json.diffs), "JSON should have diffs array");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config recommend shows POSTURE ALIGNED when config matches", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-aligned-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const out = execFileSync(process.execPath, [CLI_PATH, "config", "recommend", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("POSTURE ALIGNED"), "should show posture aligned for matching config");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config recommend shows diffs when config diverges", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-diff-"));
  try {
    // Copy medium fixture so scanner sees medium profile
    copyFixture(path.join(FIXTURE_DIR, "repo-medium"), tmpDir);

    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    // Force orgMode off to create a diff
    const configPath = path.join(tmpDir, ".mesh", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.orgMode = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    const out = execFileSync(process.execPath, [CLI_PATH, "config", "recommend", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("RECOMMENDED CHANGES"), "should show recommended changes");
    assert.ok(out.includes("orgMode"), "should recommend orgMode change");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config recommend fails without config.json", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-noconf-"));
  try {
    const result = execFileSync(process.execPath, [CLI_PATH, "config", "recommend", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Should mention init
    assert.ok(result.includes("init"), "should suggest running init");
  } catch (e) {
    // Exit code 1 expected
    assert.ok(e.stdout.includes("init") || e.stderr.includes("init"), "should suggest running init");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config tune on non-TTY produces no changes", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-tune-"));
  try {
    execFileSync(process.execPath, [CLI_PATH, "init", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });

    const out = execFileSync(process.execPath, [CLI_PATH, "config", "tune", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("HULL PROFILE DETECTED"), "should display hull profile");
    assert.ok(out.includes("Config Tune"), "should have Config Tune heading");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: config with no subcommand shows usage", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-cfg-usage-"));
  try {
    const out = execFileSync(process.execPath, [CLI_PATH, "config", "--target", tmpDir], {
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    assert.ok(out.includes("recommend"), "should mention recommend subcommand");
    assert.ok(out.includes("tune"), "should mention tune subcommand");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("cli: usage includes config command", () => {
  const out = execFileSync(process.execPath, [CLI_PATH], {
    encoding: "utf-8",
  });
  assert.ok(out.includes("config"), "usage should mention config");
  assert.ok(out.includes("recommend"), "usage should mention recommend");
});
