const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const mercuryMesh = require("../index.cjs");
const { loadRuntimeConfig } = require("../.mesh/nervous-system/index.js");
const {
  resolveEmbeddingProviderConfig,
} = require("../.mesh/nervous-system/semantic-gravimetry.js");

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
    /Configure nervousSystem\.embeddingApiKey in \.mesh\/local\.json/,
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