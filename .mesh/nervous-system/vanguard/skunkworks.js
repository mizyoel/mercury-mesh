#!/usr/bin/env node
/**
 * The Skunkworks — Quarantined R&D Foundry
 *
 * Phase V.2 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * Prototypes uncharted ideas in quarantined isolation. Each experiment
 * runs in a dedicated worktree under the mesh/skunkworks/ namespace,
 * structurally walled off from the operational Mesh.
 *
 * Experiment lifecycle:
 *   drafted → active → review → [promoted | dissolved]
 *
 * Depends on:
 *   - rd-wing.js for R&D Wing materialization
 *   - worktree-manager.js for git isolation
 *   - skill-synthesis.js for capability generation
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const { synthesizeRdBlueprint, materializeRdWing, checkRdTTL, checkRdBudget, loadRdWing } = require('./rd-wing.js');

// ─── Constants ──────────────────────────────────────────────────────────────

const REGISTRY_FILE = 'registry.json';
const SCHEMA_VERSION = 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateExperimentId(title) {
  const hash = createHash('sha256').update(title + Date.now()).digest('hex').slice(0, 8);
  return `exp-${hash}`;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ─── Registry Management ────────────────────────────────────────────────────

/**
 * Load the Skunkworks registry.
 *
 * @param {string} meshDir
 * @returns {object}
 */
function loadRegistry(meshDir) {
  const regPath = path.join(meshDir, 'vanguard', 'skunkworks', REGISTRY_FILE);
  return readJsonSafe(regPath) || {
    schemaVersion: SCHEMA_VERSION,
    maxConcurrentExperiments: 2,
    active: [],
    completed: [],
    dissolved: [],
    totalTokensBurned: 0,
    totalExperimentsRun: 0,
  };
}

/**
 * Save the Skunkworks registry.
 *
 * @param {string} meshDir
 * @param {object} registry
 */
function saveRegistry(meshDir, registry) {
  const dir = path.join(meshDir, 'vanguard', 'skunkworks');
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, REGISTRY_FILE),
    JSON.stringify(registry, null, 2) + '\n',
    'utf8',
  );
}

// ─── Experiment Lifecycle ───────────────────────────────────────────────────

/**
 * Draft a new Skunkworks experiment.
 *
 * @param {string} meshDir
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.hypothesis
 * @param {string[]} options.domain
 * @param {string[]} [options.successCriteria]
 * @param {string} [options.originType] - "speculative-sortie" | "commander-directed"
 * @param {string} [options.sourceId] - Source sortie or commander directive
 * @param {string} [options.adjacencyCandidate] - Outrider candidate ID
 * @param {object} [options.config] - Skunkworks config overrides
 * @returns {{ success: boolean, experiment?: object, reason?: string }}
 */
function draftExperiment(meshDir, options) {
  const registry = loadRegistry(meshDir);
  const config = options.config || {};
  const maxConcurrent = config.maxConcurrentExperiments || registry.maxConcurrentExperiments || 2;

  const experimentId = generateExperimentId(options.title || 'untitled');
  const expDir = path.join(meshDir, 'vanguard', 'skunkworks', experimentId);

  const experiment = {
    schemaVersion: SCHEMA_VERSION,
    id: experimentId,
    title: options.title || 'Untitled Experiment',
    origin: {
      type: options.originType || 'commander-directed',
      sourceId: options.sourceId || null,
      adjacencyCandidate: options.adjacencyCandidate || null,
    },
    hypothesis: options.hypothesis || '',
    successCriteria: options.successCriteria || [],
    domain: options.domain || [],
    status: 'drafted',
    createdAt: new Date().toISOString(),
    worktree: {
      branch: `mesh/skunkworks/${experimentId}`,
      path: null,
    },
    budget: {
      maxTokens: config.tokenBudgetPerExperiment || 50000,
      tokensUsed: 0,
      maxLifespanHours: config.maxLifespanHours || 168,
      elapsedHours: 0,
      maxAgents: config.maxAgents || 2,
    },
    rdWingId: null,
    results: null,
  };

  // Write hypothesis file
  ensureDir(expDir);
  fs.writeFileSync(
    path.join(expDir, 'hypothesis.json'),
    JSON.stringify(experiment, null, 2) + '\n',
    'utf8',
  );

  return { success: true, experiment };
}

/**
 * Activate a drafted experiment: create R&D Wing and update registry.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {object} [config] - Vanguard config
 * @returns {{ success: boolean, experiment?: object, rdWing?: object, reason?: string }}
 */
function activateExperiment(meshDir, experimentId, config = {}) {
  const registry = loadRegistry(meshDir);
  const maxConcurrent = (config.skunkworks || {}).maxConcurrentExperiments || registry.maxConcurrentExperiments || 2;

  if (registry.active.length >= maxConcurrent) {
    return {
      success: false,
      reason: `Skunkworks at capacity: ${registry.active.length}/${maxConcurrent} experiments active`,
    };
  }

  const expPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'hypothesis.json');
  const experiment = readJsonSafe(expPath);
  if (!experiment) {
    return { success: false, reason: `Experiment "${experimentId}" not found` };
  }
  if (experiment.status !== 'drafted') {
    return { success: false, reason: `Experiment "${experimentId}" is "${experiment.status}", expected "drafted"` };
  }

  // Synthesize R&D Wing
  const rdBlueprint = synthesizeRdBlueprint({
    experimentId,
    title: experiment.title,
    hypothesis: experiment.hypothesis,
    domain: experiment.domain,
    adjacencyCandidate: experiment.origin.adjacencyCandidate,
    config: {
      maxLifespanHours: experiment.budget.maxLifespanHours,
      tokenBudgetPerExperiment: experiment.budget.maxTokens,
      maxParallelism: experiment.budget.maxAgents,
    },
  });

  // Materialize R&D Wing
  const wingReport = materializeRdWing(meshDir, experimentId, rdBlueprint, true);

  // Update experiment
  experiment.status = 'active';
  experiment.rdWingId = rdBlueprint.id;
  fs.writeFileSync(expPath, JSON.stringify(experiment, null, 2) + '\n', 'utf8');

  // Update registry
  registry.active.push(experimentId);
  registry.totalExperimentsRun++;
  saveRegistry(meshDir, registry);

  return {
    success: true,
    experiment,
    rdWing: rdBlueprint,
    wingReport,
  };
}

/**
 * Move an experiment to review status.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {object} [results] - Experiment results to record
 * @returns {{ success: boolean, reason?: string }}
 */
function reviewExperiment(meshDir, experimentId, results = {}) {
  const expPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'hypothesis.json');
  const experiment = readJsonSafe(expPath);
  if (!experiment) {
    return { success: false, reason: `Experiment "${experimentId}" not found` };
  }
  if (experiment.status !== 'active') {
    return { success: false, reason: `Experiment is "${experiment.status}", expected "active"` };
  }

  experiment.status = 'review';
  experiment.results = results;
  fs.writeFileSync(expPath, JSON.stringify(experiment, null, 2) + '\n', 'utf8');

  return { success: true };
}

/**
 * Promote a reviewed experiment to the Horizon Deck.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @returns {{ success: boolean, experiment?: object, reason?: string }}
 */
function promoteExperiment(meshDir, experimentId) {
  const expPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'hypothesis.json');
  const experiment = readJsonSafe(expPath);
  if (!experiment) {
    return { success: false, reason: `Experiment "${experimentId}" not found` };
  }
  if (experiment.status !== 'review') {
    return { success: false, reason: `Experiment is "${experiment.status}", expected "review"` };
  }

  experiment.status = 'promoted';
  fs.writeFileSync(expPath, JSON.stringify(experiment, null, 2) + '\n', 'utf8');

  // Move from active to completed in registry
  const registry = loadRegistry(meshDir);
  registry.active = registry.active.filter((id) => id !== experimentId);
  registry.completed.push(experimentId);
  saveRegistry(meshDir, registry);

  return { success: true, experiment };
}

/**
 * Dissolve an experiment — archive it and clean up.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {string} [failureClass] - Failure taxonomy classification
 * @param {string} [reason]
 * @returns {{ success: boolean, tokensConsumed: number, reason?: string }}
 */
function dissolveExperiment(meshDir, experimentId, failureClass, reason) {
  const expPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'hypothesis.json');
  const experiment = readJsonSafe(expPath);
  if (!experiment) {
    return { success: false, tokensConsumed: 0, reason: `Experiment "${experimentId}" not found` };
  }

  const rdWing = loadRdWing(meshDir, experimentId);
  const tokensConsumed = rdWing ? (rdWing.rdMeta.tokensUsed || 0) : 0;

  // Record results before dissolution
  experiment.status = 'dissolved';
  experiment.results = experiment.results || {};
  experiment.results.failureClass = failureClass || 'unknown';
  experiment.results.dissolutionReason = reason || 'Manual dissolution';
  experiment.results.dissolvedAt = new Date().toISOString();
  experiment.results.tokensConsumed = tokensConsumed;
  fs.writeFileSync(expPath, JSON.stringify(experiment, null, 2) + '\n', 'utf8');

  // Update registry
  const registry = loadRegistry(meshDir);
  registry.active = registry.active.filter((id) => id !== experimentId);
  registry.dissolved.push(experimentId);
  registry.totalTokensBurned += tokensConsumed;
  saveRegistry(meshDir, registry);

  return { success: true, tokensConsumed };
}

// ─── Experiment Monitoring ──────────────────────────────────────────────────

/**
 * Check all active experiments for budget/TTL violations.
 *
 * @param {string} meshDir
 * @returns {{ warnings: Array, expired: Array }}
 */
function checkExperiments(meshDir) {
  const registry = loadRegistry(meshDir);
  const warnings = [];
  const expired = [];

  for (const expId of registry.active) {
    const rdWing = loadRdWing(meshDir, expId);
    if (!rdWing) continue;

    const ttl = checkRdTTL(rdWing);
    const budget = checkRdBudget(rdWing);

    if (ttl.expired) {
      expired.push({
        experimentId: expId,
        reason: 'ttl-expired',
        hoursRemaining: 0,
      });
    } else if (ttl.hoursRemaining < 24) {
      warnings.push({
        experimentId: expId,
        type: 'ttl-warning',
        hoursRemaining: ttl.hoursRemaining,
      });
    }

    if (budget.exceeded) {
      expired.push({
        experimentId: expId,
        reason: 'budget-exhausted',
        tokensUsed: budget.used,
        budget: budget.budget,
      });
    } else if (budget.percentUsed >= 80) {
      warnings.push({
        experimentId: expId,
        type: 'budget-warning',
        percentUsed: budget.percentUsed,
      });
    }
  }

  return { warnings, expired };
}

/**
 * Load a specific experiment's hypothesis.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @returns {object|null}
 */
function loadExperiment(meshDir, experimentId) {
  const expPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'hypothesis.json');
  return readJsonSafe(expPath);
}

/**
 * List all experiments by status.
 *
 * @param {string} meshDir
 * @returns {object}
 */
function listExperiments(meshDir) {
  const registry = loadRegistry(meshDir);
  return {
    active: registry.active,
    completed: registry.completed,
    dissolved: registry.dissolved,
    totalTokensBurned: registry.totalTokensBurned,
    totalExperimentsRun: registry.totalExperimentsRun,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  draftExperiment,
  activateExperiment,
  reviewExperiment,
  promoteExperiment,
  dissolveExperiment,
  checkExperiments,
  loadExperiment,
  listExperiments,
  loadRegistry,
  saveRegistry,
  generateExperimentId,
};
