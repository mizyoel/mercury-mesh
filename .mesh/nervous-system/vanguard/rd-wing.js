#!/usr/bin/env node
/**
 * R&D Wing Factory — Experimental Ghost Wing Subtype
 *
 * Phase V.4 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * R&D Wings are Ghost Wings with modified lifecycle parameters:
 *   - Longer TTL (168h vs 72h)
 *   - Sandboxed autonomy mode
 *   - Not registered in structure.json (invisible to Gravimetry)
 *   - Promote through Genesis instead of solidification
 *
 * Depends on:
 *   - ghost-wing.js (Phase III) for blueprint generation primitives
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// ─── R&D Wing ID Generation ────────────────────────────────────────────────

function generateRdWingId(experimentId) {
  const hash = createHash('sha256').update(experimentId + '-rd').digest('hex').slice(0, 8);
  return `rd-wing-${hash}`;
}

// ─── R&D Wing Blueprint ────────────────────────────────────────────────────

/**
 * Create an R&D Wing blueprint for a Skunkworks experiment.
 *
 * @param {object} options
 * @param {string} options.experimentId
 * @param {string} options.title
 * @param {string} options.hypothesis
 * @param {string[]} options.domain
 * @param {string[]} [options.routingKeywords]
 * @param {string} [options.adjacencyCandidate]
 * @param {object} [options.config] - R&D Wing config overrides
 * @returns {object} R&D Wing blueprint
 */
function synthesizeRdBlueprint(options) {
  const {
    experimentId,
    title,
    hypothesis,
    domain = [],
    routingKeywords,
    adjacencyCandidate,
    config = {},
  } = options;

  const wingId = generateRdWingId(experimentId);
  const maxLifespanHours = config.maxLifespanHours || 168;
  const maxParallelism = config.maxParallelism || 2;

  return {
    id: wingId,
    name: `${title} R&D Wing`,
    lifecycle: 'rd-experimental',
    parentExperiment: experimentId,
    synthesizedAt: new Date().toISOString(),
    synthesizedFrom: {
      adjacencyCandidate: adjacencyCandidate || null,
      hypothesis: hypothesis || '',
    },
    domain,
    routingKeywords: routingKeywords || domain,
    lead: '{uncast}',
    members: [],
    leadStyle: 'player-coach',
    authority: {
      canDecideLocally: [
        'prototype implementation approach',
        'test strategy within experiment scope',
        'skill draft content and structure',
      ],
      mustEscalate: [
        'exceeding token budget',
        'requesting operational Wing data',
        'modifying any file outside Skunkworks worktree',
      ],
    },
    runtime: {
      autonomyMode: 'sandboxed',
      maxParallelism,
      claimLeaseMinutes: 20,
      heartbeatMinutes: 10,
    },
    rdMeta: {
      maxLifespanHours,
      budgetTokens: config.tokenBudgetPerExperiment || 50000,
      tokensUsed: 0,
      startedAt: null,
      expiresAt: null,
    },
    results: {
      artifactsProduced: [],
      skillsSynthesized: [],
      teamStructureNotes: '',
      executionLog: [],
    },
  };
}

// ─── R&D Wing Materialization ───────────────────────────────────────────────

/**
 * Materialize an R&D Wing inside a Skunkworks experiment directory.
 * Unlike standard Ghost Wings, R&D Wings are NOT registered in structure.json.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {object} blueprint
 * @param {boolean} [apply=false]
 * @returns {object} materialization report
 */
function materializeRdWing(meshDir, experimentId, blueprint, apply = false) {
  const expDir = path.join(meshDir, 'vanguard', 'skunkworks', experimentId);
  const report = {
    wingId: blueprint.id,
    created: [],
    errors: [],
  };

  // Set timestamps
  const now = new Date();
  blueprint.rdMeta.startedAt = now.toISOString();
  blueprint.rdMeta.expiresAt = new Date(
    now.getTime() + blueprint.rdMeta.maxLifespanHours * 60 * 60 * 1000,
  ).toISOString();

  const files = {
    'rd-wing.json': JSON.stringify(blueprint, null, 2) + '\n',
    'backlog.md': generateRdBacklog(blueprint),
  };

  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(expDir, name);
    try {
      if (apply) {
        fs.mkdirSync(expDir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
      }
      report.created.push(filePath);
    } catch (err) {
      report.errors.push({ file: name, error: err.message });
    }
  }

  return report;
}

function generateRdBacklog(blueprint) {
  return [
    `# ${blueprint.name} — R&D Backlog`,
    '',
    `> **Lifecycle:** RD-EXPERIMENTAL — Skunkworks prototype, not operational.`,
    `> **Experiment:** ${blueprint.parentExperiment}`,
    `> **Hypothesis:** ${blueprint.synthesizedFrom.hypothesis}`,
    '',
    '## Tasks',
    '',
    '| ID | Title | Status | Notes |',
    '| --- | --- | --- | --- |',
    `| ${blueprint.id}-001 | Validate hypothesis via prototype | queued | Initial R&D task |`,
    '',
  ].join('\n');
}

// ─── R&D Wing Lifecycle ─────────────────────────────────────────────────────

/**
 * Check if an R&D Wing has exceeded its time-to-live.
 *
 * @param {object} blueprint
 * @returns {{ expired: boolean, hoursRemaining: number }}
 */
function checkRdTTL(blueprint) {
  if (!blueprint.rdMeta || !blueprint.rdMeta.expiresAt) {
    return { expired: false, hoursRemaining: Infinity };
  }
  const now = Date.now();
  const expires = new Date(blueprint.rdMeta.expiresAt).getTime();
  const remaining = (expires - now) / (1000 * 60 * 60);
  return {
    expired: remaining <= 0,
    hoursRemaining: Math.max(0, Math.round(remaining * 10) / 10),
  };
}

/**
 * Check if an R&D Wing has exceeded its token budget.
 *
 * @param {object} blueprint
 * @returns {{ exceeded: boolean, used: number, budget: number, percentUsed: number }}
 */
function checkRdBudget(blueprint) {
  const used = blueprint.rdMeta.tokensUsed || 0;
  const budget = blueprint.rdMeta.budgetTokens || 50000;
  return {
    exceeded: used >= budget,
    used,
    budget,
    percentUsed: Math.round((used / budget) * 100),
  };
}

/**
 * Record token usage for an R&D Wing.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {number} tokens
 * @returns {{ success: boolean, totalUsed: number }}
 */
function recordTokenUsage(meshDir, experimentId, tokens) {
  const wingPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'rd-wing.json');
  try {
    const blueprint = JSON.parse(fs.readFileSync(wingPath, 'utf8'));
    blueprint.rdMeta.tokensUsed = (blueprint.rdMeta.tokensUsed || 0) + tokens;
    fs.writeFileSync(wingPath, JSON.stringify(blueprint, null, 2) + '\n', 'utf8');
    return { success: true, totalUsed: blueprint.rdMeta.tokensUsed };
  } catch {
    return { success: false, totalUsed: 0 };
  }
}

/**
 * Load an R&D Wing blueprint from disk.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @returns {object|null}
 */
function loadRdWing(meshDir, experimentId) {
  const wingPath = path.join(meshDir, 'vanguard', 'skunkworks', experimentId, 'rd-wing.json');
  try {
    return JSON.parse(fs.readFileSync(wingPath, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  generateRdWingId,
  synthesizeRdBlueprint,
  materializeRdWing,
  checkRdTTL,
  checkRdBudget,
  recordTokenUsage,
  loadRdWing,
};
