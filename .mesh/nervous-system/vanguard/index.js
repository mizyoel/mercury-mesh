#!/usr/bin/env node
/**
 * Vanguard — Autonomous Innovation Subsystem Orchestrator
 *
 * Phase V of the Mercury Mesh Nervous System
 *
 * The Vanguard's index orchestrates all sub-components and exposes
 * a unified `tick()` function that the Autonomic Core's pulse loop calls.
 *
 * Components:
 *   V.1  Outrider           — Void cartographer, adjacency scanning
 *   V.2  Skunkworks         — Quarantined R&D foundry
 *   V.3  Skill Synthesis    — Autonomous capability generation
 *   V.4  R&D Wing           — Ghost Wing subtype factory
 *   V.5  Genesis Protocols  — Permanent integration pipeline
 *   V.6  Horizon Deck       — Command authorization staging area
 *   V.7  Speculative Sortie — Mesh-initiated innovation missions
 *
 * Authority model:
 *   - Scan/Draft/Prototype/Stage: autonomous within budget
 *   - Authorize/Integrate/Revert: Commander-only (Event Horizon)
 */
'use strict';

const outrider = require('./outrider.js');
const skunkworks = require('./skunkworks.js');
const skillSynthesis = require('./skill-synthesis.js');
const rdWing = require('./rd-wing.js');
const genesis = require('./genesis-protocols.js');
const horizonDeck = require('./horizon-deck.js');
const speculativeSortie = require('./speculative-sortie.js');

// ─── Tick — Called from Autonomic Core Pulse ─────────────────────────────────

/**
 * Execute one Vanguard tick. Called on each Autonomic Core pulse.
 *
 * The tick evaluates all sub-systems in dependency order:
 *   1. Outrider scan (if interval elapsed)
 *   2. Skunkworks experiment monitoring (TTL/budget checks)
 *   3. Speculative Sortie generation (if triggers met)
 *   4. Horizon Deck decay check
 *   5. Genesis cooldown monitoring
 *
 * @param {string} meshDir - Absolute path to .mesh directory
 * @param {object} config - Merged vanguard config section
 * @param {object} [constellation] - Constellation store instance
 * @returns {Promise<object>} tick report
 */
async function tick(meshDir, config, constellation) {
  const vConfig = config || {};
  const report = {
    timestamp: new Date().toISOString(),
    outrider: null,
    skunkworks: null,
    sorties: null,
    horizonDeck: null,
    genesis: null,
  };

  // ── 1. Outrider Scan ──────────────────────────────────────────────────

  const outriderConfig = vConfig.outrider || {};
  const scanInterval = outriderConfig.scanIntervalHours || 24;

  if (outrider.shouldScan(meshDir, scanInterval)) {
    try {
      const scanResult = await outrider.scan(meshDir, {
        constellation,
        config: vConfig,
      });
      report.outrider = {
        scanned: true,
        newCandidates: scanResult.newCandidates.length,
        totalCandidates: scanResult.totalCandidates,
      };
    } catch (err) {
      report.outrider = { scanned: false, error: err.message };
    }
  } else {
    report.outrider = { scanned: false, reason: 'interval-not-elapsed' };
  }

  // ── 2. Skunkworks Monitoring ──────────────────────────────────────────

  try {
    const expCheck = skunkworks.checkExperiments(meshDir);
    report.skunkworks = {
      warnings: expCheck.warnings,
      expired: expCheck.expired,
    };

    // Auto-dissolve expired experiments
    for (const expired of expCheck.expired) {
      skunkworks.dissolveExperiment(meshDir, expired.experimentId, expired.reason, `Auto-dissolved: ${expired.reason}`);
    }
  } catch (err) {
    report.skunkworks = { error: err.message };
  }

  // ── 3. Speculative Sortie Generation ──────────────────────────────────

  const sortieConfig = vConfig.speculativeSortie || {};
  try {
    const sortieResult = speculativeSortie.maybeGenerate(meshDir, {
      config: sortieConfig,
    });
    report.sorties = {
      generated: sortieResult.generated.length,
      staged: sortieResult.staged.length,
      drafted: sortieResult.drafted.length,
    };
  } catch (err) {
    report.sorties = { error: err.message };
  }

  // ── 4. Horizon Deck Decay ─────────────────────────────────────────────

  const horizonConfig = vConfig.horizonDeck || {};
  try {
    const decayResult = horizonDeck.checkDecay(meshDir, {
      warningDays: horizonConfig.decayWarningDays || 7,
    });
    report.horizonDeck = {
      decayed: decayResult.decayed.length,
      decayingSoon: decayResult.decayingSoon.length,
      stats: horizonDeck.stats(meshDir),
    };
  } catch (err) {
    report.horizonDeck = { error: err.message };
  }

  // ── 5. Genesis Cooldown Monitoring ────────────────────────────────────

  try {
    const cooldownResult = genesis.checkCooldowns(meshDir);
    report.genesis = {
      activeCooldowns: cooldownResult.active.length,
      completedCooldowns: cooldownResult.completed.length,
      anomalies: cooldownResult.anomalies.length,
    };
  } catch (err) {
    report.genesis = { error: err.message };
  }

  return report;
}

// ─── Diagnostics ────────────────────────────────────────────────────────────

/**
 * Gather Vanguard diagnostic information.
 *
 * @param {string} meshDir
 * @returns {object}
 */
function diagnostics(meshDir) {
  const adjacencyMap = outrider.loadAdjacencyMap(meshDir);
  const experiments = skunkworks.listExperiments(meshDir);
  const horizonStats = horizonDeck.stats(meshDir);
  const genesisList = genesis.listProposals(meshDir);
  const sortieLog = speculativeSortie.loadSortieLog(meshDir);

  return {
    outrider: {
      lastScan: adjacencyMap.lastScan,
      candidates: adjacencyMap.candidates.length,
      topCandidate: adjacencyMap.candidates.length > 0
        ? { id: adjacencyMap.candidates[0].id, score: adjacencyMap.candidates[0].score }
        : null,
    },
    skunkworks: {
      active: experiments.active.length,
      completed: experiments.completed.length,
      dissolved: experiments.dissolved.length,
      totalTokensBurned: experiments.totalTokensBurned,
    },
    horizonDeck: horizonStats,
    genesis: {
      total: genesisList.length,
      integrated: genesisList.filter((p) => p.status === 'integrated' || p.status === 'complete').length,
      awaitingAuth: genesisList.filter((p) => p.status === 'awaiting-authorization').length,
    },
    sorties: {
      totalGenerated: sortieLog.sorties ? sortieLog.sorties.length : 0,
      lastGenerated: sortieLog.lastGeneratedAt,
    },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Orchestrator
  tick,
  diagnostics,

  // Sub-components (re-exported for direct access)
  outrider,
  skunkworks,
  skillSynthesis,
  rdWing,
  genesis,
  horizonDeck,
  speculativeSortie,
};
