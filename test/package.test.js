const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mercuryMesh = require("../index.cjs");

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