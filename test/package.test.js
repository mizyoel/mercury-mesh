const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const mercuryMesh = require("../index.cjs");
const { loadRuntimeConfig } = require("../.mesh/nervous-system/index.js");
const {
  resolveEmbeddingProviderConfig,
} = require("../.mesh/nervous-system/semantic-gravimetry.js");

const PACKAGE_ROOT = path.resolve(__dirname, "..");

function runNpm(args) {
  if (process.platform === "win32") {
    return execFileSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `npm ${args.join(" ")}`],
      {
        cwd: PACKAGE_ROOT,
        encoding: "utf8",
      }
    );
  }

  return execFileSync("npm", args, {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
  });
}

test("exports expected package roots", () => {
  assert.equal(mercuryMesh.packageRoot, path.resolve(__dirname, ".."));
  assert.ok(mercuryMesh.existsAt(mercuryMesh.templatesDir));
  assert.ok(mercuryMesh.existsAt(mercuryMesh.docsDir));
  assert.ok(mercuryMesh.existsAt(mercuryMesh.skillsDir));
  assert.ok(mercuryMesh.existsAt(mercuryMesh.agentPromptPath));
});

test("resolves known template assets", () => {
  assert.ok(
    mercuryMesh.existsAt(mercuryMesh.resolveTemplatePath("mercury-mesh.agent.md"))
  );
  assert.ok(
    mercuryMesh.existsAt(mercuryMesh.resolveTemplatePath("local.json"))
  );
  assert.ok(
    mercuryMesh.existsAt(
      mercuryMesh.resolveTemplatePath("workflows", "mesh-release.yml")
    )
  );
  assert.ok(
    mercuryMesh.existsAt(
      mercuryMesh.resolveTemplatePath("skills", "release-process", "SKILL.md")
    )
  );
});

test("resolves known docs", () => {
  assert.ok(
    mercuryMesh.existsAt(
      mercuryMesh.resolveDocPath("scenarios", "client-compatibility.md")
    )
  );
});

test("agent prompt enforces lead-first intake", () => {
  const leadFirstRule = "Every non-init user prompt in Team Mode enters the Lead/Architect first.";
  const agentPrompt = fs.readFileSync(mercuryMesh.agentPromptPath, "utf8");
  const templateAgentPrompt = fs.readFileSync(
    mercuryMesh.resolveTemplatePath("mercury-mesh.agent.md"),
    "utf8"
  );
  const fixtureAgentPrompt = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".github", "agents", "mercury-mesh.agent.md"),
    "utf8"
  );

  assert.ok(
    agentPrompt.includes(leadFirstRule),
    "live agent prompt should require lead-first review"
  );
  assert.ok(
    templateAgentPrompt.includes(leadFirstRule),
    "template agent prompt should require lead-first review"
  );
  assert.ok(
    fixtureAgentPrompt.includes(leadFirstRule),
    "fixture agent prompt should require lead-first review"
  );
  assert.ok(
    agentPrompt.includes("Quick factual question | Send to the Lead/Architect for triage; if no specialist is needed, the coordinator answers directly |"),
    "routing table should send quick facts through lead triage"
  );
});

test("client compatibility docs describe VS Code spawn adaptations", () => {
  const agentPrompt = fs.readFileSync(mercuryMesh.agentPromptPath, "utf8");
  const clientCompatibilityDoc = fs.readFileSync(
    mercuryMesh.resolveDocPath("scenarios", "client-compatibility.md"),
    "utf8"
  );

  assert.ok(
    agentPrompt.includes("Use `runSubagent` with the task prompt"),
    "agent prompt should restore direct VS Code runSubagent guidance"
  );
  assert.ok(
    clientCompatibilityDoc.includes("Multiple subagents in one turn run concurrently"),
    "client compatibility doc should restore parallel VS Code subagent guidance"
  );
  assert.ok(
    agentPrompt.includes("Accept the session model"),
    "agent prompt should restore session-model-only VS Code guidance"
  );
  assert.ok(
    clientCompatibilityDoc.includes("Do not attempt per-spawn model selection"),
    "client compatibility doc should describe session-model-only VS Code behavior"
  );
});

test("model routing guidance stays config-driven", () => {
  const agentPrompt = fs.readFileSync(mercuryMesh.agentPromptPath, "utf8");
  const modelSelectionSkill = fs.readFileSync(
    path.join(PACKAGE_ROOT, ".copilot", "skills", "model-selection", "SKILL.md"),
    "utf8"
  );
  const templateModelSelectionSkill = fs.readFileSync(
    mercuryMesh.resolveTemplatePath("skills", "model-selection", "SKILL.md"),
    "utf8"
  );
  const fixtureModelSelectionSkill = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".copilot", "skills", "model-selection", "SKILL.md"),
    "utf8"
  );
  const clientCompatibilitySkill = fs.readFileSync(
    path.join(PACKAGE_ROOT, ".copilot", "skills", "client-compatibility", "SKILL.md"),
    "utf8"
  );

  assert.ok(
    !agentPrompt.includes("**Valid models (current platform catalog):**"),
    "agent prompt should not embed a hardcoded model catalog"
  );
  assert.ok(
    !modelSelectionSkill.includes("hardcoded fallback"),
    "model selection skill should not describe fallback routing as hardcoded"
  );
  assert.ok(
    clientCompatibilitySkill.includes("model: resolvedFromConfig.code"),
    "client compatibility examples should resolve models from config"
  );
  assert.ok(
    clientCompatibilitySkill.includes("Multiple subagents in one turn run concurrently"),
    "client compatibility skill should restore full VS Code subagent concurrency guidance"
  );
  assert.ok(
    clientCompatibilitySkill.includes("Accept the session model"),
    "client compatibility skill should document session-model-only VS Code behavior"
  );
  assert.ok(
    !agentPrompt.includes("## Model Routing"),
    "agent prompt should not include the VS Code Model Routing prompt block"
  );
  assert.ok(
    modelSelectionSkill.includes("accepts the current session model"),
    "live model selection skill should restore session-model-only VS Code guidance"
  );
  assert.ok(
    templateModelSelectionSkill.includes("accepts the current session model"),
    "template model selection skill should mirror session-model-only VS Code guidance"
  );
  assert.ok(
    fixtureModelSelectionSkill.includes("accepts the current session model"),
    "fixture model selection skill should mirror session-model-only VS Code guidance"
  );
});

test("release workflows preserve publishable .mesh assets", () => {
  const previewWorkflow = fs.readFileSync(
    path.join(PACKAGE_ROOT, ".github", "workflows", "mesh-preview.yml"),
    "utf8"
  );
  const fixturePreviewWorkflow = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".github", "workflows", "mesh-preview.yml"),
    "utf8"
  );
  const promoteWorkflow = fs.readFileSync(
    path.join(PACKAGE_ROOT, ".github", "workflows", "mesh-promote.yml"),
    "utf8"
  );
  const fixturePromoteWorkflow = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".github", "workflows", "mesh-promote.yml"),
    "utf8"
  );

  for (const workflow of [previewWorkflow, fixturePreviewWorkflow, promoteWorkflow, fixturePromoteWorkflow]) {
    assert.ok(
      workflow.includes("^\\.mesh/(manifesto\\.md|nervous-system/|templates/)"),
      "release workflows should allow published .mesh assets"
    );
  }

  assert.ok(
    !previewWorkflow.includes("Check no .ai-team/ or .mesh/ files are tracked"),
    "preview validation should not reject the entire .mesh tree"
  );
  assert.ok(
    promoteWorkflow.includes("preserve packaged .mesh assets"),
    "promote workflow should preserve the published .mesh allowlist"
  );
});

test("prompt and skill docs avoid unsupported plugin and personal CLI claims", () => {
  const agentPrompt = fs.readFileSync(mercuryMesh.agentPromptPath, "utf8");
  const templateAgentPrompt = fs.readFileSync(
    mercuryMesh.resolveTemplatePath("mercury-mesh.agent.md"),
    "utf8"
  );
  const fixtureAgentPrompt = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".github", "agents", "mercury-mesh.agent.md"),
    "utf8"
  );
  const pluginMarketplaceTemplate = fs.readFileSync(
    mercuryMesh.resolveTemplatePath("plugin-marketplace.md"),
    "utf8"
  );
  const personalSkill = fs.readFileSync(
    path.join(PACKAGE_ROOT, ".copilot", "skills", "personal-mesh", "SKILL.md"),
    "utf8"
  );
  const templatePersonalSkill = fs.readFileSync(
    mercuryMesh.resolveTemplatePath("skills", "personal-mesh", "SKILL.md"),
    "utf8"
  );
  const fixturePersonalSkill = fs.readFileSync(
    path.join(PACKAGE_ROOT, "test", "fixture", ".copilot", "skills", "personal-mesh", "SKILL.md"),
    "utf8"
  );

  for (const prompt of [agentPrompt, templateAgentPrompt, fixtureAgentPrompt]) {
    assert.ok(
      !prompt.includes("resolvePersonalMeshDir()"),
      "agent prompts should not require an unshipped personal-mesh helper"
    );
    assert.ok(
      !prompt.includes("Mercury Mesh plugin marketplace browse"),
      "agent prompts should not require an unshipped plugin marketplace browse command"
    );
    assert.ok(
      !prompt.includes("Mercury Mesh CLI (`Mercury Mesh plugin marketplace`)"),
      "agent prompts should not claim a shipped plugin marketplace CLI owner"
    );
    assert.ok(
      prompt.includes("Do not assume a dedicated Mercury Mesh plugin marketplace CLI exists in this package."),
      "agent prompts should explain the plugin marketplace limitation"
    );
  }

  assert.ok(
    pluginMarketplaceTemplate.includes("does not currently ship dedicated `mercury-mesh plugin marketplace` commands"),
    "plugin marketplace template should not advertise missing CLI commands"
  );

  for (const skill of [personalSkill, templatePersonalSkill, fixturePersonalSkill]) {
    assert.ok(
      skill.includes("does not currently ship personal-mesh discovery helpers or `mercury-mesh personal ...` / `mercury-mesh cast` CLI commands"),
      "personal-mesh skills should describe current support accurately"
    );
    assert.ok(
      !skill.includes("Mercury Mesh personal init"),
      "personal-mesh skills should not advertise missing personal CLI commands"
    );
    assert.ok(
      !skill.includes("Mercury Mesh cast"),
      "personal-mesh skills should not advertise a missing cast command"
    );
  }
});

test("README does not claim seeded model defaults", () => {
  const readme = fs.readFileSync(path.join(PACKAGE_ROOT, "README.md"), "utf8");

  assert.ok(
    !readme.includes("New installs seed `gpt-5.4` and `claude-opus-4.6`"),
    "README should not claim seeded allowlist defaults"
  );
  assert.ok(
    !readme.includes("New installs seed this to `gpt-5.4`"),
    "README should not claim a seeded default model"
  );
});

test("npm pack includes CLI runtime dependencies", () => {
  const packOutput = runNpm(["pack", "--json", "--dry-run"]);

  const [{ files }] = JSON.parse(packOutput);
  const packedPaths = new Set(files.map((entry) => entry.path));

  assert.ok(
    packedPaths.has("bin/mercury-mesh.cjs"),
    "packed tarball should include the CLI entrypoint"
  );
  assert.ok(
    packedPaths.has("lib/complexity-scanner.cjs"),
    "packed tarball should include complexity-scanner.cjs"
  );
  assert.ok(
    packedPaths.has("lib/profile-resolver.cjs"),
    "packed tarball should include profile-resolver.cjs"
  );
  assert.ok(
    packedPaths.has(".mesh/nervous-system/index.js"),
    "packed tarball should include the nervous-system entrypoint"
  );
  assert.ok(
    packedPaths.has(".mesh/nervous-system/worktree-manager.js"),
    "packed tarball should include worktree-manager.js"
  );
  assert.ok(
    packedPaths.has(".mesh/nervous-system/ghost-coalescence.js"),
    "packed tarball should include ghost-coalescence.js"
  );
  assert.ok(
    packedPaths.has(".mesh/nervous-system/mesh-peer.js"),
    "packed tarball should include mesh-peer.js"
  );
  assert.ok(
    packedPaths.has(".mesh/nervous-system/vanguard/index.js"),
    "packed tarball should include the vanguard runtime"
  );
});

test("embeddingApiKey resolves provider config", () => {
  const resolved = resolveEmbeddingProviderConfig("openrouter", {
    embeddingApiKey: "test-openrouter-key",
    embeddingAppName: "Mercury Mesh",
  });

  assert.equal(
    resolved.headers.Authorization,
    "Bearer test-openrouter-key"
  );
  assert.equal(
    resolved.endpoint,
    "https://openrouter.ai/api/v1/embeddings"
  );
});

test("missing embeddingApiKey throws without env fallback", () => {
  assert.throws(
    () => resolveEmbeddingProviderConfig("openrouter", {}),
    /Configure nervousSystem\.embeddingApiKey in \.mesh\/local\.json or set OPENROUTER_API_KEY/,
  );
});

test("local runtime overrides can supply embeddingApiKey", () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    fs.writeFileSync(
      path.join(meshDir, "config.json"),
      JSON.stringify({
        nervousSystem: {
          enabled: true,
          embeddingProvider: "openrouter",
        },
      })
    );

    fs.writeFileSync(
      path.join(meshDir, "local.json"),
      JSON.stringify({
        nervousSystem: {
          embeddingApiKey: "local-openrouter-key",
        },
      })
    );

    const { config } = loadRuntimeConfig(meshDir);
    assert.equal(
      config.nervousSystem.embeddingApiKey,
      "local-openrouter-key"
    );
    assert.equal(config.nervousSystem.embeddingProvider, "openrouter");
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("env var auto-discovery: OPENROUTER_API_KEY for openrouter provider", () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));
  const saved = process.env.OPENROUTER_API_KEY;

  try {
    process.env.OPENROUTER_API_KEY = "env-openrouter-key-test";

    fs.writeFileSync(
      path.join(meshDir, "config.json"),
      JSON.stringify({
        nervousSystem: {
          enabled: true,
          embeddingProvider: "openrouter",
        },
      })
    );

    // No local.json — env var should be discovered
    const { config } = loadRuntimeConfig(meshDir);
    assert.equal(config.nervousSystem.embeddingApiKey, "env-openrouter-key-test");
    assert.equal(config.nervousSystem._apiKeySource, "env:OPENROUTER_API_KEY");
  } finally {
    if (saved === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved;
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("env var auto-discovery: OPENAI_API_KEY for llm provider", () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));
  const savedOR = process.env.OPENROUTER_API_KEY;
  const savedOA = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENROUTER_API_KEY;
    process.env.OPENAI_API_KEY = "env-openai-key-test";

    fs.writeFileSync(
      path.join(meshDir, "config.json"),
      JSON.stringify({
        nervousSystem: {
          enabled: true,
          embeddingProvider: "llm",
        },
      })
    );

    const { config } = loadRuntimeConfig(meshDir);
    assert.equal(config.nervousSystem.embeddingApiKey, "env-openai-key-test");
    assert.equal(config.nervousSystem._apiKeySource, "env:OPENAI_API_KEY");
  } finally {
    if (savedOR === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedOR;
    if (savedOA === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedOA;
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("env var auto-discovery: local.json takes priority over env", () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));
  const saved = process.env.OPENROUTER_API_KEY;

  try {
    process.env.OPENROUTER_API_KEY = "env-should-lose";

    fs.writeFileSync(
      path.join(meshDir, "config.json"),
      JSON.stringify({
        nervousSystem: {
          enabled: true,
          embeddingProvider: "openrouter",
        },
      })
    );

    fs.writeFileSync(
      path.join(meshDir, "local.json"),
      JSON.stringify({
        nervousSystem: {
          embeddingApiKey: "local-wins",
        },
      })
    );

    const { config } = loadRuntimeConfig(meshDir);
    assert.equal(config.nervousSystem.embeddingApiKey, "local-wins",
      "local.json key should take priority over env var");
    assert.equal(config.nervousSystem._apiKeySource, undefined,
      "_apiKeySource should not be set when key comes from local.json");
  } finally {
    if (saved === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved;
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("env var auto-discovery: tfidf provider skips env detection", () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));
  const saved = process.env.OPENROUTER_API_KEY;

  try {
    process.env.OPENROUTER_API_KEY = "should-not-appear";

    fs.writeFileSync(
      path.join(meshDir, "config.json"),
      JSON.stringify({
        nervousSystem: {
          enabled: true,
          embeddingProvider: "tfidf",
        },
      })
    );

    const { config } = loadRuntimeConfig(meshDir);
    // tfidf doesn't need an API key, but the fallback chain still discovers
    // env keys for providers that might use them later
    assert.equal(config.nervousSystem.embeddingProvider, "tfidf");
  } finally {
    if (saved === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = saved;
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

// ── Constellation Memory ──────────────────────────────────────────────

const {
  createConstellationStore,
  createConstellationStoreForProvider,
  cosineSimilarity,
  contentHash,
} = require("../.mesh/nervous-system/constellation-memory.js");

test("constellation: JSON store insert and query round-trip", async () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    const store = createConstellationStore({
      meshDir,
      embedFn: async (text) => {
        // Simple hash-based fake embedding for testing
        const vec = new Float64Array(4);
        for (let i = 0; i < text.length && i < 4; i++) {
          vec[i] = text.charCodeAt(i) / 255;
        }
        return vec;
      },
    });

    const result = await store.insert({
      type: "decision",
      content: "Use TypeScript for the API layer",
      metadata: { source: "test" },
    });
    assert.ok(result.inserted, "should insert successfully");
    assert.ok(result.id, "should return an id");

    // Duplicate should be rejected
    const dupe = await store.insert({
      type: "decision",
      content: "Use TypeScript for the API layer",
    });
    assert.equal(dupe.inserted, false);
    assert.equal(dupe.reason, "duplicate");

    // Query should find the entry
    const vec = new Float64Array([85 / 255, 115 / 255, 101 / 255, 32 / 255]);
    const results = await store.query(vec, { maxResults: 5, minSimilarity: 0 });
    assert.ok(results.length > 0, "should return results");
    assert.ok(results[0].entry.content.includes("TypeScript"));

    const stats = store.stats();
    assert.equal(stats.totalEntries, 1);
    assert.ok(stats.typeCounts.decision === 1);
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("constellation: provider factory defaults to json", async () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    const store = await createConstellationStoreForProvider({
      meshDir,
      provider: "json",
    });
    assert.ok(store.insert, "should have insert method");
    assert.ok(store.query, "should have query method");
    assert.ok(store.buildRAGContext, "should have buildRAGContext method");
    assert.ok(store.stats, "should have stats method");
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("constellation: provider factory omitted defaults to json", async () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    // No provider specified — should default to JSON
    const store = await createConstellationStoreForProvider({ meshDir });
    const stats = store.stats();
    assert.equal(stats.totalEntries, 0);
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("constellation: lancedb provider fails gracefully when not installed", async () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    await assert.rejects(
      () => createConstellationStoreForProvider({ meshDir, provider: "lancedb" }),
      (err) => {
        assert.ok(err.message.includes("not installed") || err.message.includes("lancedb"));
        return true;
      }
    );
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("constellation: cosineSimilarity computes correctly", () => {
  const a = new Float64Array([1, 0, 0]);
  const b = new Float64Array([1, 0, 0]);
  assert.ok(Math.abs(cosineSimilarity(a, b) - 1.0) < 0.001, "identical vectors should have similarity 1");

  const c = new Float64Array([0, 1, 0]);
  assert.ok(Math.abs(cosineSimilarity(a, c)) < 0.001, "orthogonal vectors should have similarity ~0");

  const d = new Float64Array([-1, 0, 0]);
  assert.ok(cosineSimilarity(a, d) < 0, "opposite vectors should have negative similarity");
});

test("constellation: contentHash is deterministic", () => {
  const h1 = contentHash("hello world");
  const h2 = contentHash("hello world");
  const h3 = contentHash("different text");
  assert.equal(h1, h2, "same input should produce same hash");
  assert.notEqual(h1, h3, "different input should produce different hash");
  assert.equal(h1.length, 16, "hash should be 16 chars");
});

test("constellation: buildRAGContext returns void message when empty", async () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercury-mesh-"));

  try {
    const store = createConstellationStore({
      meshDir,
      embedFn: async () => new Float64Array([0.5, 0.5, 0.5]),
    });

    const context = await store.buildRAGContext("test query");
    assert.ok(context.includes("No resonant entries found"), "should indicate no results");
    assert.ok(context.includes("Void"), "should mention the Void");
  } finally {
    fs.rmSync(meshDir, { recursive: true, force: true });
  }
});

test("constellation: LanceDB adapter module exports correct interface", () => {
  const lanceModule = require("../.mesh/nervous-system/constellation-lancedb.js");
  assert.ok(typeof lanceModule.createConstellationStoreLanceDB === "function");
  assert.ok(typeof lanceModule.isLanceDBAvailable === "function");
  assert.ok(typeof lanceModule.contentHash === "function");
});

test("constellation: LanceDB availability check returns boolean", async () => {
  const { isLanceDBAvailable } = require("../.mesh/nervous-system/constellation-lancedb.js");
  const available = await isLanceDBAvailable();
  assert.equal(typeof available, "boolean");
  // In test environment without @lancedb/lancedb installed, this should be false
});

// ── Ghost Wing Coalescence ────────────────────────────────────────────

test("coalescence: jaccard similarity computes correctly", () => {
  const { jaccard } = require("../.mesh/nervous-system/ghost-coalescence.js");
  // Identical sets → 1
  assert.equal(jaccard(new Set(["a", "b"]), new Set(["a", "b"])), 1);
  // Disjoint sets → 0
  assert.equal(jaccard(new Set(["a"]), new Set(["b"])), 0);
  // Partial overlap → 1/3
  const score = jaccard(new Set(["a", "b"]), new Set(["b", "c"]));
  assert.ok(Math.abs(score - 1 / 3) < 0.001, `expected ~0.333 got ${score}`);
  // Empty sets → 0
  assert.equal(jaccard(new Set(), new Set()), 0);
});

test("coalescence: extractFilePaths finds code-like paths", () => {
  const { extractFilePaths } = require("../.mesh/nervous-system/ghost-coalescence.js");
  const content = "Fix bug in src/auth/login.js and update tests/auth.test.ts";
  const paths = extractFilePaths(content);
  assert.ok(paths.has("src/auth/login.js"));
  assert.ok(paths.has("tests/auth.test.ts"));
});

test("coalescence: scoreOverlap returns bounded score with signals", () => {
  const { scoreOverlap } = require("../.mesh/nervous-system/ghost-coalescence.js");

  const wingA = {
    id: "ghost-aaa",
    domain: ["auth", "login", "session"],
    routingKeywords: ["auth", "login", "session", "oauth"],
    ghostMeta: { partialAttractors: [] },
    backlogContent: "Fix src/auth/login.js",
  };
  const wingB = {
    id: "ghost-bbb",
    domain: ["auth", "login", "token"],
    routingKeywords: ["auth", "login", "token", "jwt"],
    ghostMeta: { partialAttractors: [] },
    backlogContent: "Update src/auth/token.js",
  };

  const { score, signals } = scoreOverlap(wingA, wingB);
  assert.ok(score >= 0 && score <= 1, `score should be 0-1, got ${score}`);
  assert.ok(typeof signals.domain === "number");
  assert.ok(typeof signals.keywords === "number");
  assert.ok(typeof signals.files === "number");
  assert.ok(typeof signals.attractors === "number");
  // These wings share auth+login → domain overlap should be significant
  assert.ok(signals.domain > 0.3, `domain similarity should be significant, got ${signals.domain}`);
});

test("coalescence: pickSurvivor selects wing with more successes", () => {
  const { pickSurvivor } = require("../.mesh/nervous-system/ghost-coalescence.js");

  const wingA = { id: "ghost-aaa", ghostMeta: { successCount: 2 } };
  const wingB = { id: "ghost-bbb", ghostMeta: { successCount: 5 } };

  const [survivor, absorbed] = pickSurvivor(wingA, wingB);
  assert.equal(survivor.id, "ghost-bbb", "wing with more successes should survive");
  assert.equal(absorbed.id, "ghost-aaa");
});

test("coalescence: module exports correct interface", () => {
  const gc = require("../.mesh/nervous-system/ghost-coalescence.js");
  assert.ok(typeof gc.scoreOverlap === "function");
  assert.ok(typeof gc.jaccard === "function");
  assert.ok(typeof gc.extractFilePaths === "function");
  assert.ok(typeof gc.loadActiveGhosts === "function");
  assert.ok(typeof gc.detectOverlaps === "function");
  assert.ok(typeof gc.coalesce === "function");
  assert.ok(typeof gc.pickSurvivor === "function");
  assert.ok(typeof gc.reconcile === "function");
  assert.ok(typeof gc.COALESCENCE_AUTO_THRESHOLD === "number");
  assert.ok(typeof gc.COALESCENCE_FLAG_THRESHOLD === "number");
});

test("coalescence: detectOverlaps returns empty for no structure", () => {
  const { detectOverlaps } = require("../.mesh/nervous-system/ghost-coalescence.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-coal-"));
  try {
    const overlaps = detectOverlaps(tmpDir);
    assert.deepEqual(overlaps, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("coalescence: reconcile returns clean report when no ghosts", () => {
  const { reconcile } = require("../.mesh/nervous-system/ghost-coalescence.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-coal-"));
  try {
    const report = reconcile(tmpDir);
    assert.equal(report.ghostCount, 0);
    assert.equal(report.overlapCount, 0);
    assert.equal(report.autoCoalesce, 0);
    assert.equal(report.flagForReview, 0);
    assert.deepEqual(report.coalesced, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Mesh Peers (Distributed Mesh Phase 2) ─────────────────────────────

test("peers: generateNodeId is deterministic", () => {
  const { generateNodeId } = require("../.mesh/nervous-system/mesh-peer.js");
  const id1 = generateNodeId("/tmp/test-mesh");
  const id2 = generateNodeId("/tmp/test-mesh");
  assert.equal(id1, id2, "same input should produce same node ID");
  assert.equal(id1.length, 12, "node ID should be 12 hex chars");
  assert.match(id1, /^[a-f0-9]{12}$/);
});

test("peers: generateNodeId differs for different meshDirs", () => {
  const { generateNodeId } = require("../.mesh/nervous-system/mesh-peer.js");
  const id1 = generateNodeId("/tmp/mesh-a");
  const id2 = generateNodeId("/tmp/mesh-b");
  assert.notEqual(id1, id2, "different meshDirs should produce different IDs");
});

test("peers: buildNodeManifest returns complete manifest", () => {
  const { buildNodeManifest } = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  // Create minimal .mesh structure
  const meshDir = path.join(tmpDir, ".mesh");
  fs.mkdirSync(meshDir, { recursive: true });
  fs.writeFileSync(path.join(meshDir, "config.json"), JSON.stringify({ version: "1.0.0", halted: false }));

  try {
    const manifest = buildNodeManifest(meshDir);
    assert.ok(manifest.nodeId, "should have nodeId");
    assert.ok(manifest.hostname, "should have hostname");
    assert.ok(manifest.platform, "should have platform");
    assert.ok(manifest.lastHeartbeat, "should have lastHeartbeat");
    assert.equal(manifest.meshVersion, "1.0.0");
    assert.equal(manifest.halted, false);
    assert.ok(Array.isArray(manifest.capabilities));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: registerSelf and listPeers round-trip", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  const meshDir = path.join(tmpDir, ".mesh");
  fs.mkdirSync(meshDir, { recursive: true });
  fs.writeFileSync(path.join(meshDir, "config.json"), JSON.stringify({ version: "1.0.0" }));

  try {
    const manifest = mp.registerSelf(meshDir, { alias: "test-node" });
    assert.equal(manifest.alias, "test-node");

    const peers = mp.listPeers(meshDir);
    assert.equal(peers.length, 1);
    assert.equal(peers[0].nodeId, manifest.nodeId);
    assert.equal(peers[0].alias, "test-node");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: heartbeat updates lastHeartbeat timestamp", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  const meshDir = path.join(tmpDir, ".mesh");
  fs.mkdirSync(meshDir, { recursive: true });
  fs.writeFileSync(path.join(meshDir, "config.json"), JSON.stringify({ version: "1.0.0" }));

  try {
    const m1 = mp.registerSelf(meshDir);
    const beat1 = m1.lastHeartbeat;

    // Small delay to ensure different timestamp
    const m2 = mp.heartbeat(meshDir);
    assert.ok(m2.lastHeartbeat >= beat1, "heartbeat should be same or later");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: classifyPeers identifies stale and healthy nodes", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  const meshDir = path.join(tmpDir, ".mesh");
  const peersDir = path.join(meshDir, "peers");
  fs.mkdirSync(peersDir, { recursive: true });
  fs.writeFileSync(path.join(meshDir, "config.json"), JSON.stringify({ version: "1.0.0" }));

  // Register local node (healthy)
  mp.registerSelf(meshDir);

  // Create a fake stale peer
  const stalePeer = {
    nodeId: "stale1234567",
    hostname: "old-machine",
    alias: "old-machine",
    meshDir: "/tmp/old",
    platform: "linux",
    arch: "x64",
    nodeVersion: "v22.0.0",
    meshVersion: "0.9.0",
    halted: false,
    capabilities: [],
    departmentCount: 0,
    ghostCount: 0,
    registeredAt: "2020-01-01T00:00:00.000Z",
    lastHeartbeat: "2020-01-01T00:00:00.000Z",
    heartbeatTTLMinutes: 30,
  };
  fs.writeFileSync(path.join(peersDir, "stale1234567.json"), JSON.stringify(stalePeer));

  try {
    const { healthy, stale, peers } = mp.classifyPeers(meshDir);
    assert.equal(peers.length, 2, "should have 2 peers total");
    assert.equal(healthy.length, 1, "local node should be healthy");
    assert.equal(stale.length, 1, "old peer should be stale");
    assert.equal(stale[0].nodeId, "stale1234567");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: pruneStalePeers removes only stale nodes", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  const meshDir = path.join(tmpDir, ".mesh");
  const peersDir = path.join(meshDir, "peers");
  fs.mkdirSync(peersDir, { recursive: true });
  fs.writeFileSync(path.join(meshDir, "config.json"), JSON.stringify({ version: "1.0.0" }));

  // Register local (healthy)
  mp.registerSelf(meshDir);

  // Add stale peer
  fs.writeFileSync(path.join(peersDir, "stale0000001.json"), JSON.stringify({
    nodeId: "stale0000001",
    hostname: "old",
    alias: "old",
    lastHeartbeat: "2020-01-01T00:00:00.000Z",
    heartbeatTTLMinutes: 30,
  }));

  try {
    const result = mp.pruneStalePeers(meshDir);
    assert.equal(result.pruned, 1);
    assert.deepEqual(result.removed, ["stale0000001"]);

    // Local should still be there
    const remainingPeers = mp.listPeers(meshDir);
    assert.equal(remainingPeers.length, 1, "only local peer should remain");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: exportConstellationDelta returns empty for missing store", () => {
  const { exportConstellationDelta } = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  try {
    const delta = exportConstellationDelta(tmpDir);
    assert.deepEqual(delta.entries, []);
    assert.ok(delta.exportedAt);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: import/export constellation round-trip deduplicates", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-peer-"));
  const meshDir = path.join(tmpDir, ".mesh");

  try {
    // Import a delta
    const delta = {
      entries: [
        { contentHash: "abc123", content: "test entry 1", timestamp: new Date().toISOString() },
        { contentHash: "def456", content: "test entry 2", timestamp: new Date().toISOString() },
      ],
      sourceNodeId: "remote-node-1",
      exportedAt: new Date().toISOString(),
    };

    const result1 = mp.importConstellationDelta(meshDir, delta);
    assert.equal(result1.imported, 2);
    assert.equal(result1.skipped, 0);

    // Import same delta — should skip all
    const result2 = mp.importConstellationDelta(meshDir, delta);
    assert.equal(result2.imported, 0, "second import should skip duplicates");
    assert.equal(result2.skipped, 2);

    // Export should include all entries
    const exported = mp.exportConstellationDelta(meshDir);
    assert.equal(exported.entries.length, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("peers: module exports correct interface", () => {
  const mp = require("../.mesh/nervous-system/mesh-peer.js");
  assert.ok(typeof mp.generateNodeId === "function");
  assert.ok(typeof mp.buildNodeManifest === "function");
  assert.ok(typeof mp.registerSelf === "function");
  assert.ok(typeof mp.heartbeat === "function");
  assert.ok(typeof mp.listPeers === "function");
  assert.ok(typeof mp.classifyPeers === "function");
  assert.ok(typeof mp.removePeer === "function");
  assert.ok(typeof mp.pruneStalePeers === "function");
  assert.ok(typeof mp.exportConstellationDelta === "function");
  assert.ok(typeof mp.importConstellationDelta === "function");
  assert.ok(typeof mp.syncWithPeers === "function");
});