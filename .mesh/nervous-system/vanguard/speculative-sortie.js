#!/usr/bin/env node
/**
 * Speculative Sortie — Mesh-Initiated Innovation Missions
 *
 * Phase V.7 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * A mission the ship proposes to its Commander.
 * Autonomously drafts experimental feature plans from Outrider
 * adjacency discoveries when conditions are met.
 *
 * Triggers:
 *   1. Adjacency discovery (score ≥ minimumAdjacencyScore)
 *   2. Idle capacity detection (no active Sorties for threshold)
 *   3. Commander cadence timer (weekly/monthly)
 *
 * Output: Experiment proposals fed into the Skunkworks pipeline
 * Authority: Draft is autonomous. Execution requires Skunkworks budget.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const { loadAdjacencyMap, promoteCandidate } = require('./outrider.js');
const { draftExperiment, activateExperiment, listExperiments } = require('./skunkworks.js');
const { stageItem } = require('./horizon-deck.js');

// ─── Constants ──────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;
const SORTIE_LOG_FILE = 'sortie-log.json';

const DEFAULT_CONFIG = {
  minimumAdjacencyScore: 0.55,
  idleThresholdMinutes: 120,
  cadence: null,                // null | 'weekly' | 'monthly'
  autoApprove: false,           // If true, auto-draft experiments; if false, stage on Horizon Deck
  maxDraftsPerCycle: 2,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSortieId(candidateId) {
  const hash = createHash('sha256').update(candidateId + Date.now()).digest('hex').slice(0, 8);
  return `sortie-${hash}`;
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

// ─── Sortie Log ─────────────────────────────────────────────────────────────

function loadSortieLog(meshDir) {
  const logPath = path.join(meshDir, 'vanguard', 'speculative-sorties', SORTIE_LOG_FILE);
  return readJsonSafe(logPath) || {
    schemaVersion: SCHEMA_VERSION,
    sorties: [],
    lastGeneratedAt: null,
    lastCadenceCheck: null,
  };
}

function saveSortieLog(meshDir, log) {
  const dir = path.join(meshDir, 'vanguard', 'speculative-sorties');
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, SORTIE_LOG_FILE),
    JSON.stringify(log, null, 2) + '\n',
    'utf8',
  );
}

function saveSortie(meshDir, sortie) {
  const sortieDir = path.join(meshDir, 'vanguard', 'speculative-sorties');
  ensureDir(sortieDir);
  fs.writeFileSync(
    path.join(sortieDir, `${sortie.id}.json`),
    JSON.stringify(sortie, null, 2) + '\n',
    'utf8',
  );
}

// ─── Trigger Evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate whether conditions are met for sortie generation.
 *
 * @param {string} meshDir
 * @param {object} [options]
 * @param {object} [options.config]
 * @returns {{ shouldGenerate: boolean, triggers: string[], eligibleCandidates: Array }}
 */
function evaluateTriggers(meshDir, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
  const triggers = [];
  const eligibleCandidates = [];

  // Trigger 1: Adjacency discovery
  const adjacencyMap = loadAdjacencyMap(meshDir);
  for (const candidate of (adjacencyMap.candidates || [])) {
    if (candidate.status !== 'discovered') continue;
    if (candidate.score >= config.minimumAdjacencyScore) {
      eligibleCandidates.push(candidate);
    }
  }
  if (eligibleCandidates.length > 0) {
    triggers.push('adjacency-discovery');
  }

  // Trigger 2: Idle capacity
  const skunkworksState = listExperiments(meshDir);
  if (skunkworksState.active.length === 0) {
    // Check if enough idle time has passed
    const log = loadSortieLog(meshDir);
    const lastGenerated = log.lastGeneratedAt ? new Date(log.lastGeneratedAt).getTime() : 0;
    const idleMinutes = (Date.now() - lastGenerated) / (1000 * 60);
    if (idleMinutes >= config.idleThresholdMinutes) {
      triggers.push('idle-capacity');
    }
  }

  // Trigger 3: Cadence timer
  if (config.cadence) {
    const log = loadSortieLog(meshDir);
    const lastCadence = log.lastCadenceCheck ? new Date(log.lastCadenceCheck).getTime() : 0;
    const elapsed = Date.now() - lastCadence;
    const cadenceMs = config.cadence === 'weekly'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

    if (elapsed >= cadenceMs) {
      triggers.push('cadence-timer');
    }
  }

  return {
    shouldGenerate: triggers.length > 0 && eligibleCandidates.length > 0,
    triggers,
    eligibleCandidates,
  };
}

// ─── Sortie Draft Generation ────────────────────────────────────────────────

/**
 * Draft a Speculative Sortie from an adjacency candidate.
 *
 * @param {object} candidate - Outrider adjacency candidate
 * @param {object} [options]
 * @returns {object} sortie draft
 */
function draftSortie(candidate, options = {}) {
  const sortieId = generateSortieId(candidate.id);
  const domainStr = (candidate.domain || []).join(', ');

  return {
    schemaVersion: SCHEMA_VERSION,
    id: sortieId,
    origin: 'vanguard',
    type: 'speculative',
    title: `Explore ${domainStr || 'unknown domain'}`,
    objective: `Investigate adjacency candidate "${candidate.id}" in the ${domainStr} domain space. Outrider scored this candidate at ${candidate.score}.`,
    adjacencyCandidate: candidate.id,
    hypothesis: `The ${domainStr} domain space contains exploitable patterns that the Mesh can learn to route effectively.`,
    executionPlan: [
      `Analyze ${domainStr} domain patterns from Ghost Wing residue and Constellation data`,
      'Synthesize embedding vectors for domain-specific routing',
      'Run synthetic test Sorties to measure Gravimetry accuracy',
      'If accuracy meets threshold: synthesize skill draft',
      'If accuracy below threshold: record failure patterns, dissolve',
    ],
    estimatedTokenBudget: options.tokenBudget || 50000,
    estimatedTimeHours: options.timeHours || 48,
    risks: [
      `${domainStr} patterns may not produce meaningful Gravimetry separation`,
      'Domain terminology may collide with existing routing keywords',
    ],
    signals: candidate.signals || {},
    score: candidate.score,
    status: 'drafted',
    generatedAt: new Date().toISOString(),
    generatedBy: `outrider-candidate-${candidate.id}`,
  };
}

// ─── Main Generation Cycle ──────────────────────────────────────────────────

/**
 * Run a speculative sortie generation cycle.
 * Evaluates triggers, drafts sorties, and routes them to
 * either Skunkworks (autoApprove) or Horizon Deck (manual).
 *
 * @param {string} meshDir
 * @param {object} [options]
 * @param {object} [options.config] - Speculative sortie config
 * @returns {{ generated: Array, staged: Array, drafted: Array }}
 */
function maybeGenerate(meshDir, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
  const evaluation = evaluateTriggers(meshDir, { config });

  if (!evaluation.shouldGenerate) {
    return { generated: [], staged: [], drafted: [] };
  }

  const log = loadSortieLog(meshDir);
  const generated = [];
  const staged = [];
  const drafted = [];

  // Limit drafts per cycle
  const candidates = evaluation.eligibleCandidates.slice(0, config.maxDraftsPerCycle);

  for (const candidate of candidates) {
    const sortie = draftSortie(candidate, {
      tokenBudget: config.tokenBudgetPerExperiment || 50000,
      timeHours: config.maxLifespanHours || 48,
    });

    saveSortie(meshDir, sortie);

    generated.push(sortie);

    if (config.autoApprove) {
      // Auto-create and activate a Skunkworks experiment.
      const expResult = draftExperiment(meshDir, {
        title: sortie.title,
        hypothesis: sortie.hypothesis,
        domain: candidate.domain || [],
        successCriteria: ['Gravimetry accuracy ≥ 0.60 for domain Sorties'],
        originType: 'speculative-sortie',
        sourceId: sortie.id,
        adjacencyCandidate: candidate.id,
        config,
      });

      if (expResult.success) {
        const activationResult = activateExperiment(meshDir, expResult.experiment.id, { skunkworks: config });
        if (activationResult.success) {
          sortie.status = 'active';
          sortie.approvedAt = new Date().toISOString();
          sortie.approvedBy = 'vanguard-auto-approve';
          sortie.experimentId = expResult.experiment.id;
          saveSortie(meshDir, sortie);
          if (sortie.adjacencyCandidate) {
            promoteCandidate(meshDir, sortie.adjacencyCandidate, expResult.experiment.id);
          }
          drafted.push({ sortieId: sortie.id, experimentId: expResult.experiment.id });
        }
      }
    } else {
      // Stage on Horizon Deck for Commander review
      const stageResult = stageItem(meshDir, {
        type: 'speculative-sortie',
        title: sortie.title,
        summary: sortie.objective,
        proposalRef: sortie.id,
        priority: sortie.score >= 0.70 ? 'high' : 'normal',
        proposalData: sortie,
      });

      if (stageResult.success) {
        staged.push({ sortieId: sortie.id, horizonItem: stageResult.item });
      }
    }

    log.sorties.push({
      id: sortie.id,
      candidateId: candidate.id,
      score: candidate.score,
      generatedAt: sortie.generatedAt,
      autoApproved: config.autoApprove,
    });
  }

  log.lastGeneratedAt = new Date().toISOString();
  if (evaluation.triggers.includes('cadence-timer')) {
    log.lastCadenceCheck = log.lastGeneratedAt;
  }

  // Keep last 100 entries
  if (log.sorties.length > 100) {
    log.sorties = log.sorties.slice(-100);
  }
  saveSortieLog(meshDir, log);

  return { generated, staged, drafted };
}

/**
 * Approve a staged speculative sortie and activate its Skunkworks experiment.
 *
 * @param {string} meshDir
 * @param {string} sortieId
 * @param {object} [options]
 * @param {object} [options.config]
 * @param {string} [options.authorizedBy]
 * @param {string} [options.notes]
 * @returns {{ success: boolean, sortie?: object, experiment?: object, reason?: string }}
 */
function approveSortie(meshDir, sortieId, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
  const sortie = loadSortie(meshDir, sortieId);
  if (!sortie) {
    return { success: false, reason: `Sortie "${sortieId}" not found` };
  }
  if (sortie.experimentId) {
    return { success: false, reason: `Sortie "${sortieId}" is already linked to experiment "${sortie.experimentId}"` };
  }
  if (sortie.status !== 'drafted') {
    return { success: false, reason: `Sortie "${sortieId}" is "${sortie.status}", expected "drafted"` };
  }

  const expResult = draftExperiment(meshDir, {
    title: sortie.title,
    hypothesis: sortie.hypothesis,
    domain: sortie.domain || [],
    successCriteria: ['Gravimetry accuracy ≥ 0.60 for domain Sorties'],
    originType: 'speculative-sortie',
    sourceId: sortie.id,
    adjacencyCandidate: sortie.adjacencyCandidate,
    config,
  });

  if (!expResult.success) {
    return { success: false, reason: expResult.reason };
  }

  const activationResult = activateExperiment(meshDir, expResult.experiment.id, { skunkworks: config });
  if (!activationResult.success) {
    return { success: false, reason: activationResult.reason };
  }

  sortie.status = 'active';
  sortie.experimentId = expResult.experiment.id;
  sortie.approvedAt = new Date().toISOString();
  sortie.approvedBy = options.authorizedBy || 'commander';
  if (options.notes) {
    sortie.commanderNotes = options.notes;
  }
  saveSortie(meshDir, sortie);

  if (sortie.adjacencyCandidate) {
    promoteCandidate(meshDir, sortie.adjacencyCandidate, expResult.experiment.id);
  }

  return {
    success: true,
    sortie,
    experiment: activationResult.experiment,
  };
}

// ─── Query ──────────────────────────────────────────────────────────────────

/**
 * Load a specific sortie draft.
 *
 * @param {string} meshDir
 * @param {string} sortieId
 * @returns {object|null}
 */
function loadSortie(meshDir, sortieId) {
  const sortiePath = path.join(meshDir, 'vanguard', 'speculative-sorties', `${sortieId}.json`);
  return readJsonSafe(sortiePath);
}

/**
 * List all sortie drafts.
 *
 * @param {string} meshDir
 * @returns {Array}
 */
function listSorties(meshDir) {
  const sortieDir = path.join(meshDir, 'vanguard', 'speculative-sorties');
  if (!fs.existsSync(sortieDir)) return [];

  try {
    return fs.readdirSync(sortieDir)
      .filter((f) => f.startsWith('sortie-') && f.endsWith('.json'))
      .map((f) => readJsonSafe(path.join(sortieDir, f)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  evaluateTriggers,
  draftSortie,
  approveSortie,
  maybeGenerate,
  loadSortie,
  listSorties,
  loadSortieLog,
};
