const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// ─── Test Fixture Management ────────────────────────────────────────────────

const FIXTURE_DIR = path.join(__dirname, ".vanguard-test-target");

function cleanFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
}

function setupMeshDir() {
  cleanFixture();
  const meshDir = path.join(FIXTURE_DIR, ".mesh");
  fs.mkdirSync(path.join(meshDir, "org"), { recursive: true });
  fs.mkdirSync(path.join(meshDir, "vanguard"), { recursive: true });

  // Minimal structure.json
  fs.writeFileSync(
    path.join(meshDir, "org", "structure.json"),
    JSON.stringify({ departments: [] }, null, 2),
    "utf8"
  );

  return meshDir;
}

// ─── Outrider Tests ─────────────────────────────────────────────────────────

test("outrider: loadAdjacencyMap returns empty map when none exists", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  const map = outrider.loadAdjacencyMap(meshDir);
  assert.equal(map.schemaVersion, 1);
  assert.ok(Array.isArray(map.candidates));
  assert.equal(map.candidates.length, 0);
  assert.equal(map.lastScan, null);

  cleanFixture();
});

test("outrider: saveAdjacencyMap and loadAdjacencyMap roundtrip", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  const map = {
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [
      { id: "adj-test1234", domain: ["graphql"], score: 0.65, status: "discovered" },
    ],
  };

  outrider.saveAdjacencyMap(meshDir, map);
  const loaded = outrider.loadAdjacencyMap(meshDir);
  assert.equal(loaded.candidates.length, 1);
  assert.equal(loaded.candidates[0].id, "adj-test1234");
  assert.equal(loaded.candidates[0].score, 0.65);

  cleanFixture();
});

test("outrider: scoreAdjacency computes weighted composite", () => {
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  const score = outrider.scoreAdjacency({
    sparseZoneSignal: 1.0,
    ghostResidueSignal: 1.0,
    patternProximity: 1.0,
    voidFrequency: 1.0,
  });
  assert.equal(score, 1.0);

  const zeroScore = outrider.scoreAdjacency({
    sparseZoneSignal: 0,
    ghostResidueSignal: 0,
    patternProximity: 0,
    voidFrequency: 0,
  });
  assert.equal(zeroScore, 0);
});

test("outrider: shouldScan returns true when no prior scan", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  assert.equal(outrider.shouldScan(meshDir, 24), true);
  cleanFixture();
});

test("outrider: dismissCandidate updates status", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  const map = {
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [
      { id: "adj-dismiss1", domain: ["test"], score: 0.5, status: "discovered" },
    ],
  };
  outrider.saveAdjacencyMap(meshDir, map);

  const result = outrider.dismissCandidate(meshDir, "adj-dismiss1");
  assert.equal(result.success, true);

  const updated = outrider.loadAdjacencyMap(meshDir);
  assert.equal(updated.candidates[0].status, "dismissed");

  cleanFixture();
});

test("outrider: promoteCandidate links to experiment", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");

  const map = {
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [
      { id: "adj-promote1", domain: ["test"], score: 0.6, status: "discovered", promotedToExperiment: null },
    ],
  };
  outrider.saveAdjacencyMap(meshDir, map);

  const result = outrider.promoteCandidate(meshDir, "adj-promote1", "exp-abc");
  assert.equal(result.success, true);

  const updated = outrider.loadAdjacencyMap(meshDir);
  assert.equal(updated.candidates[0].status, "promoted");
  assert.equal(updated.candidates[0].promotedToExperiment, "exp-abc");

  cleanFixture();
});

// ─── Horizon Deck Tests ─────────────────────────────────────────────────────

test("horizon-deck: stageItem adds to queue", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  const result = hd.stageItem(meshDir, {
    type: "genesis-proposal",
    title: "Test Proposal",
    summary: "A test summary",
  });

  assert.equal(result.success, true);
  assert.ok(result.item.id.startsWith("horizon-"));
  assert.equal(result.item.status, "pending");
  assert.equal(result.item.type, "genesis-proposal");

  const pending = hd.listPending(meshDir);
  assert.equal(pending.length, 1);

  cleanFixture();
});

test("horizon-deck: authorizeItem changes status", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  const staged = hd.stageItem(meshDir, { type: "skill-draft", title: "Auth Test" });
  assert.equal(staged.success, true);

  const result = hd.authorizeItem(meshDir, staged.item.id, "commander", "looks good");
  assert.equal(result.success, true);
  assert.equal(result.item.status, "authorized");
  assert.equal(result.item.authorizedBy, "commander");
  assert.equal(result.item.commanderNotes, "looks good");

  cleanFixture();
});

test("horizon-deck: rejectItem changes status", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  const staged = hd.stageItem(meshDir, { type: "speculative-sortie", title: "Reject Test" });
  const result = hd.rejectItem(meshDir, staged.item.id, "not ready");
  assert.equal(result.success, true);
  assert.equal(result.item.status, "rejected");

  cleanFixture();
});

test("horizon-deck: capacity enforcement", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  // Stage 3 items with max capacity of 3
  for (let i = 0; i < 3; i++) {
    hd.stageItem(meshDir, { type: "genesis-proposal", title: `Item ${i}` }, { maxStagedItems: 3 });
  }

  const result = hd.stageItem(meshDir, { type: "genesis-proposal", title: "Overflow" }, { maxStagedItems: 3 });
  assert.equal(result.success, false);
  assert.ok(result.reason.includes("capacity"));

  cleanFixture();
});

test("horizon-deck: checkDecay processes expired items", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  // Manually create a queue with an already-expired item
  const queue = hd.loadQueue(meshDir);
  queue.items.push({
    id: "horizon-expired1",
    type: "genesis-proposal",
    title: "Old Proposal",
    status: "pending",
    stagedAt: "2020-01-01T00:00:00Z",
    decaysAt: "2020-02-01T00:00:00Z",
  });
  hd.saveQueue(meshDir, queue);

  const result = hd.checkDecay(meshDir);
  assert.equal(result.decayed.length, 1);
  assert.equal(result.decayed[0].id, "horizon-expired1");

  // Verify status updated
  const updated = hd.loadQueue(meshDir);
  const item = updated.items.find((i) => i.id === "horizon-expired1");
  assert.equal(item.status, "decayed");

  cleanFixture();
});

test("horizon-deck: stats returns correct counts", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  hd.stageItem(meshDir, { type: "genesis-proposal", title: "Pending 1" });
  hd.stageItem(meshDir, { type: "skill-draft", title: "Pending 2" });

  const s = hd.stats(meshDir);
  assert.equal(s.pending, 2);
  assert.equal(s.total, 2);
  assert.equal(s.authorized, 0);
  assert.ok(s.capacity > 0);
  assert.ok(s.available > 0);

  cleanFixture();
});

test("horizon-deck: inspectItem returns item and proposal data", () => {
  const meshDir = setupMeshDir();
  const hd = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  const staged = hd.stageItem(meshDir, {
    type: "genesis-proposal",
    title: "Inspect Test",
    proposalData: { hypothesis: "test" },
  });

  const { item, proposalData } = hd.inspectItem(meshDir, staged.item.id);
  assert.ok(item);
  assert.equal(item.title, "Inspect Test");
  assert.ok(proposalData);
  assert.equal(proposalData.hypothesis, "test");

  cleanFixture();
});

// ─── Skunkworks Tests ───────────────────────────────────────────────────────

test("skunkworks: draftExperiment creates experiment", () => {
  const meshDir = setupMeshDir();
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");

  const result = skunkworks.draftExperiment(meshDir, {
    title: "Test Experiment",
    hypothesis: "Testing works",
    domain: ["testing", "quality"],
    successCriteria: ["Tests pass"],
  });

  assert.equal(result.success, true);
  assert.ok(result.experiment.id.startsWith("exp-"));
  assert.equal(result.experiment.status, "drafted");
  assert.equal(result.experiment.title, "Test Experiment");

  const loaded = skunkworks.loadExperiment(meshDir, result.experiment.id);
  assert.ok(loaded);
  assert.equal(loaded.hypothesis, "Testing works");

  cleanFixture();
});

test("skunkworks: listExperiments returns correct structure", () => {
  const meshDir = setupMeshDir();
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");

  const list = skunkworks.listExperiments(meshDir);
  assert.ok(Array.isArray(list.active));
  assert.ok(Array.isArray(list.completed));
  assert.ok(Array.isArray(list.dissolved));
  assert.equal(typeof list.totalTokensBurned, "number");

  cleanFixture();
});

test("skunkworks: dissolveExperiment archives correctly", () => {
  const meshDir = setupMeshDir();
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");

  const draft = skunkworks.draftExperiment(meshDir, {
    title: "Dissolve Test",
    hypothesis: "Will dissolve",
    domain: ["test"],
  });

  // Activate first
  const activated = skunkworks.activateExperiment(meshDir, draft.experiment.id);
  assert.equal(activated.success, true);

  // Then dissolve
  const dissolved = skunkworks.dissolveExperiment(meshDir, draft.experiment.id, "test-failure", "testing dissolution");
  assert.equal(dissolved.success, true);

  const list = skunkworks.listExperiments(meshDir);
  assert.ok(list.dissolved.includes(draft.experiment.id));
  assert.ok(!list.active.includes(draft.experiment.id));

  cleanFixture();
});

// ─── R&D Wing Tests ─────────────────────────────────────────────────────────

test("rd-wing: synthesizeRdBlueprint creates valid blueprint", () => {
  const rdWing = require("../\x2emesh/nervous-system/vanguard/rd-wing.js");

  const blueprint = rdWing.synthesizeRdBlueprint({
    experimentId: "exp-test1234",
    title: "Test R&D Wing",
    hypothesis: "Testing R&D Wings work",
    domain: ["testing"],
  });

  assert.ok(blueprint.id.startsWith("rd-wing-"));
  assert.equal(blueprint.lifecycle, "rd-experimental");
  assert.ok(blueprint.rdMeta);
  assert.ok(blueprint.rdMeta.maxLifespanHours > 0);
  assert.ok(blueprint.rdMeta.budgetTokens > 0);
  assert.equal(blueprint.rdMeta.tokensUsed, 0);
});

test("rd-wing: checkRdTTL detects expiry", () => {
  const rdWing = require("../\x2emesh/nervous-system/vanguard/rd-wing.js");

  const blueprint = rdWing.synthesizeRdBlueprint({
    experimentId: "exp-ttl-test",
    title: "TTL Test",
    hypothesis: "Test TTL",
    domain: ["test"],
  });

  // Not expired yet
  const ttl = rdWing.checkRdTTL(blueprint);
  assert.equal(ttl.expired, false);
  assert.ok(ttl.hoursRemaining > 0);
});

test("rd-wing: checkRdBudget tracks token usage", () => {
  const rdWing = require("../\x2emesh/nervous-system/vanguard/rd-wing.js");

  const blueprint = rdWing.synthesizeRdBlueprint({
    experimentId: "exp-budget-test",
    title: "Budget Test",
    hypothesis: "Test budget",
    domain: ["test"],
  });

  const budget = rdWing.checkRdBudget(blueprint);
  assert.equal(budget.exceeded, false);
  assert.equal(budget.used, 0);
  assert.equal(budget.percentUsed, 0);
});

// ─── Skill Synthesis Tests ──────────────────────────────────────────────────

test("skill-synthesis: synthesizeSkill creates valid draft", () => {
  const skillSynth = require("../\x2emesh/nervous-system/vanguard/skill-synthesis.js");

  const result = skillSynth.synthesizeSkill({
    name: "Test GraphQL Routing",
    description: "Routes GraphQL queries",
    domain: "graphql, api",
    experimentId: "exp-test123",
    outriderCandidate: "adj-test123",
    rdWingId: "rd-wing-test",
    patterns: ["Use schema-derived embeddings"],
    antiPatterns: ["Do not hardcode routes"],
    context: "When routing GraphQL federation subgraph requests",
  });

  assert.ok(result.slug);
  assert.ok(result.content.includes("---"));
  assert.ok(result.content.includes("confidence: \"low\""));
  assert.ok(result.content.includes("source: \"synthesized\""));
  assert.ok(result.content.includes("Use schema-derived embeddings"));
  assert.ok(result.metadata);
  assert.equal(result.metadata.confidence, "low");
});

test("skill-synthesis: writeSkillDraft creates file when apply=true", () => {
  const meshDir = setupMeshDir();
  const skillSynth = require("../\x2emesh/nervous-system/vanguard/skill-synthesis.js");

  const draft = skillSynth.synthesizeSkill({
    name: "write test skill",
    description: "test",
    domain: "test",
    experimentId: "exp-write-test",
  });

  const result = skillSynth.writeSkillDraft(meshDir, "exp-write-test", draft, true);
  assert.equal(result.success, true);
  assert.ok(fs.existsSync(result.path));

  cleanFixture();
});

// ─── Genesis Protocols Tests ────────────────────────────────────────────────

test("genesis: validateExperiment returns issues for missing experiment", () => {
  const meshDir = setupMeshDir();
  const genesis = require("../\x2emesh/nervous-system/vanguard/genesis-protocols.js");

  const result = genesis.validateExperiment(meshDir, "nonexistent");
  assert.equal(result.valid, false);
  assert.ok(result.issues.length > 0);

  cleanFixture();
});

test("genesis: generateGenesisId produces consistent format", () => {
  const genesis = require("../\x2emesh/nervous-system/vanguard/genesis-protocols.js");

  const id = genesis.generateGenesisId("exp-test123");
  assert.ok(id.startsWith("genesis-"));
  assert.equal(id.length, 8 + "genesis-".length);
});

test("genesis: listProposals returns empty when none exist", () => {
  const meshDir = setupMeshDir();
  const genesis = require("../\x2emesh/nervous-system/vanguard/genesis-protocols.js");

  const proposals = genesis.listProposals(meshDir);
  assert.ok(Array.isArray(proposals));
  assert.equal(proposals.length, 0);

  cleanFixture();
});

test("genesis: checkCooldowns returns empty for fresh mesh", () => {
  const meshDir = setupMeshDir();
  const genesis = require("../\x2emesh/nervous-system/vanguard/genesis-protocols.js");

  const result = genesis.checkCooldowns(meshDir);
  assert.ok(Array.isArray(result.active));
  assert.ok(Array.isArray(result.completed));
  assert.equal(result.active.length, 0);

  cleanFixture();
});

test("genesis: authorizeProposal updates proposal status", () => {
  const meshDir = setupMeshDir();
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");
  const genesis = require("../\x2emesh/nervous-system/vanguard/genesis-protocols.js");

  const draft = skunkworks.draftExperiment(meshDir, {
    title: "Genesis Auth Test",
    hypothesis: "Authorization propagates",
    domain: ["testing"],
    successCriteria: ["All stages complete"],
  });
  skunkworks.activateExperiment(meshDir, draft.experiment.id);
  skunkworks.reviewExperiment(meshDir, draft.experiment.id, {
    criteriaResults: [{ criterion: "All stages complete", met: true, evidence: "Test passed" }],
  });
  skunkworks.promoteExperiment(meshDir, draft.experiment.id);

  const staged = genesis.generateAndStageProposal(meshDir, draft.experiment.id);
  assert.equal(staged.success, true);

  const authorized = genesis.authorizeProposal(meshDir, staged.proposal.id, "commander", "proceed");
  assert.equal(authorized.success, true);
  assert.equal(authorized.proposal.status, "authorized");
  assert.equal(authorized.proposal.authorizedBy, "commander");

  cleanFixture();
});

// ─── Speculative Sortie Tests ───────────────────────────────────────────────

test("speculative-sortie: draftSortie creates valid sortie", () => {
  const ss = require("../\x2emesh/nervous-system/vanguard/speculative-sortie.js");

  const candidate = {
    id: "adj-sortie1",
    domain: ["graphql", "federation"],
    score: 0.65,
    signals: { sparseZone: 0.8, ghostResidue: 0.5 },
  };

  const sortie = ss.draftSortie(candidate);
  assert.ok(sortie.id.startsWith("sortie-"));
  assert.equal(sortie.origin, "vanguard");
  assert.equal(sortie.type, "speculative");
  assert.ok(sortie.title.includes("graphql"));
  assert.equal(sortie.status, "drafted");
  assert.ok(sortie.executionPlan.length > 0);
});

test("speculative-sortie: evaluateTriggers with no candidates returns shouldGenerate false", () => {
  const meshDir = setupMeshDir();
  const ss = require("../\x2emesh/nervous-system/vanguard/speculative-sortie.js");

  const result = ss.evaluateTriggers(meshDir, { config: {} });
  assert.equal(result.shouldGenerate, false);
  assert.equal(result.eligibleCandidates.length, 0);

  cleanFixture();
});

test("speculative-sortie: maybeGenerate produces nothing when no candidates", () => {
  const meshDir = setupMeshDir();
  const ss = require("../\x2emesh/nervous-system/vanguard/speculative-sortie.js");

  const result = ss.maybeGenerate(meshDir, { config: {} });
  assert.equal(result.generated.length, 0);
  assert.equal(result.staged.length, 0);
  assert.equal(result.drafted.length, 0);

  cleanFixture();
});

test("speculative-sortie: listSorties returns empty when none exist", () => {
  const meshDir = setupMeshDir();
  const ss = require("../\x2emesh/nervous-system/vanguard/speculative-sortie.js");

  const sorties = ss.listSorties(meshDir);
  assert.ok(Array.isArray(sorties));
  assert.equal(sorties.length, 0);

  cleanFixture();
});

test("speculative-sortie: approveSortie activates experiment and promotes candidate", () => {
  const meshDir = setupMeshDir();
  const outrider = require("../\x2emesh/nervous-system/vanguard/outrider.js");
  const ss = require("../\x2emesh/nervous-system/vanguard/speculative-sortie.js");
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");

  outrider.saveAdjacencyMap(meshDir, {
    schemaVersion: 1,
    lastScan: new Date().toISOString(),
    candidates: [{
      id: "adj-sortie-approve",
      domain: ["graphql", "federation"],
      score: 0.66,
      status: "discovered",
      promotedToExperiment: null,
    }],
  });

  const sortie = ss.draftSortie({
    id: "adj-sortie-approve",
    domain: ["graphql", "federation"],
    score: 0.66,
  });
  ss.loadSortieLog(meshDir);
  fs.mkdirSync(path.join(meshDir, "vanguard", "speculative-sorties"), { recursive: true });
  fs.writeFileSync(
    path.join(meshDir, "vanguard", "speculative-sorties", `${sortie.id}.json`),
    JSON.stringify(sortie, null, 2) + "\n",
    "utf8"
  );

  const approved = ss.approveSortie(meshDir, sortie.id, { authorizedBy: "commander" });
  assert.equal(approved.success, true);
  assert.equal(approved.sortie.status, "active");
  assert.ok(approved.sortie.experimentId);

  const experiments = skunkworks.listExperiments(meshDir);
  assert.ok(experiments.active.includes(approved.sortie.experimentId));

  const updatedMap = outrider.loadAdjacencyMap(meshDir);
  assert.equal(updatedMap.candidates[0].status, "promoted");
  assert.equal(updatedMap.candidates[0].promotedToExperiment, approved.sortie.experimentId);

  cleanFixture();
});

// ─── Vanguard Orchestrator Tests ────────────────────────────────────────────

test("vanguard: diagnostics returns complete status", () => {
  const meshDir = setupMeshDir();
  const vanguard = require("../\x2emesh/nervous-system/vanguard/index.js");

  const diag = vanguard.diagnostics(meshDir);
  assert.ok(diag.outrider);
  assert.ok(diag.skunkworks);
  assert.ok(diag.horizonDeck);
  assert.ok(diag.genesis);
  assert.ok(diag.sorties);
  assert.equal(typeof diag.outrider.candidates, "number");
  assert.equal(typeof diag.skunkworks.active, "number");

  cleanFixture();
});

test("vanguard: tick returns complete report", async () => {
  const meshDir = setupMeshDir();
  const vanguard = require("../\x2emesh/nervous-system/vanguard/index.js");

  const report = await vanguard.tick(meshDir, {}, null);
  assert.ok(report.timestamp);
  assert.ok(report.outrider);
  assert.ok(report.skunkworks);
  assert.ok(report.horizonDeck);
  assert.ok(report.genesis);

  cleanFixture();
});

test("vanguard: exports all sub-components", () => {
  const vanguard = require("../\x2emesh/nervous-system/vanguard/index.js");

  assert.ok(vanguard.outrider);
  assert.ok(vanguard.skunkworks);
  assert.ok(vanguard.skillSynthesis);
  assert.ok(vanguard.rdWing);
  assert.ok(vanguard.genesis);
  assert.ok(vanguard.horizonDeck);
  assert.ok(vanguard.speculativeSortie);
  assert.equal(typeof vanguard.tick, "function");
  assert.equal(typeof vanguard.diagnostics, "function");
});

// ─── Integration Flow Test ──────────────────────────────────────────────────

test("vanguard: full experiment lifecycle — draft → activate → review → promote", () => {
  const meshDir = setupMeshDir();
  const skunkworks = require("../\x2emesh/nervous-system/vanguard/skunkworks.js");
  const horizonDeck = require("../\x2emesh/nervous-system/vanguard/horizon-deck.js");

  // 1. Draft
  const draft = skunkworks.draftExperiment(meshDir, {
    title: "Lifecycle Test",
    hypothesis: "Full lifecycle works",
    domain: ["testing"],
    successCriteria: ["All stages complete"],
  });
  assert.equal(draft.success, true);
  assert.equal(draft.experiment.status, "drafted");

  // 2. Activate
  const activated = skunkworks.activateExperiment(meshDir, draft.experiment.id);
  assert.equal(activated.success, true);
  const loadedActive = skunkworks.loadExperiment(meshDir, draft.experiment.id);
  assert.equal(loadedActive.status, "active");

  // 3. Review
  const reviewed = skunkworks.reviewExperiment(meshDir, draft.experiment.id, {
    criteriaResults: [{ criterion: "All stages complete", met: true, evidence: "Test passed" }],
  });
  assert.equal(reviewed.success, true);

  // 4. Promote
  const promoted = skunkworks.promoteExperiment(meshDir, draft.experiment.id);
  assert.equal(promoted.success, true);
  assert.equal(promoted.experiment.status, "promoted");

  // Verify registry
  const list = skunkworks.listExperiments(meshDir);
  assert.ok(list.completed.includes(draft.experiment.id));
  assert.ok(!list.active.includes(draft.experiment.id));

  cleanFixture();
});

// Cleanup after all tests
test("cleanup: remove vanguard fixture", () => {
  cleanFixture();
});
