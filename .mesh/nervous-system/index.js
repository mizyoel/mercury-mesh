#!/usr/bin/env node
/**
 * Mercury Mesh Nervous System — Unified Orchestrator
 *
 * Wires all four phases of the nervous system into a single coherent organism:
 *
 *   Phase I   :: Semantic Gravimetry   — intent-based gravitational routing
 *   Phase II  :: Autonomic Core        — persistent metabolism and drift correction
 *   Phase III :: Ghost Wing Synthesis  — emergent topology from the Void
 *   Phase IV  :: Constellation Memory  — spatial memory with RAG
 *
 * The orchestrator is the nervous system's spinal cord:
 *   - Boots all subsystems in dependency order
 *   - Connects event channels between phases
 *   - Provides a unified API for the bridge agent and ralph-triage
 *   - Handles graceful degradation when subsystems are unavailable
 *
 * Boot: node .mesh/nervous-system/index.js --mesh-dir .mesh [--daemon]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const { createGravimetryEngine } = require('./semantic-gravimetry.js');
const { createAutonomicCore, scanDriftWeather } = require('./autonomic-core.js');
const { synthesizeBlueprint, materialize, evaluateLifecycle, solidify, dissolve } = require('./ghost-wing.js');
const { reconcile: reconcileCoalescence } = require('./ghost-coalescence.js');
const { registerSelf: registerPeer, heartbeat: peerHeartbeat, classifyPeers, syncWithPeers } = require('./mesh-peer.js');
const { createConstellationStore, createConstellationStoreForProvider } = require('./constellation-memory.js');

const RUNTIME_DIR_CANDIDATES = ['.mesh', '.mercury'];

function loadRuntimeConfig(meshDir) {
  const configPath = path.join(meshDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const localConfigPath = path.join(meshDir, 'local.json');
  let localConfig = {};

  if (fs.existsSync(localConfigPath)) {
    localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
  }

  // Merge: config.json < local.json < environment variables (lowest priority wins last)
  const merged = {
    ...(config.nervousSystem || {}),
    ...(localConfig.nervousSystem || {}),
  };

  // Auto-discover embedding API key from environment if not set in config files
  if (!merged.embeddingApiKey) {
    const provider = merged.embeddingProvider || 'tfidf';
    if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      merged.embeddingApiKey = process.env.OPENROUTER_API_KEY;
      merged._apiKeySource = 'env:OPENROUTER_API_KEY';
    } else if (provider === 'llm' && process.env.OPENAI_API_KEY) {
      merged.embeddingApiKey = process.env.OPENAI_API_KEY;
      merged._apiKeySource = 'env:OPENAI_API_KEY';
    } else if (process.env.OPENROUTER_API_KEY) {
      merged.embeddingApiKey = process.env.OPENROUTER_API_KEY;
      merged._apiKeySource = 'env:OPENROUTER_API_KEY';
    } else if (process.env.OPENAI_API_KEY) {
      merged.embeddingApiKey = process.env.OPENAI_API_KEY;
      merged._apiKeySource = 'env:OPENAI_API_KEY';
    }
  }

  return {
    configPath,
    localConfigPath,
    config: {
      ...config,
      nervousSystem: merged,
    },
  };
}

// ─── Configuration Schema ───────────────────────────────────────────────────

const NERVOUS_SYSTEM_DEFAULTS = {
  enabled: true,
  embeddingProvider: 'tfidf',       // 'tfidf' | 'openrouter' | legacy 'llm'
  embeddingModel: null,             // null = provider default model
  embeddingEndpoint: null,          // null = provider default endpoint
  embeddingAppName: 'Mercury Mesh',
  embeddingAppUrl: null,
  gravimetry: {
    minimumGravity: 0.15,
    airbridgeThreshold: 0.70,
    airbridgeMinShare: 0.20,
  },
  autonomic: {
    pulseMs: 30_000,
    contextDecayMinutes: 60,
    applyCorrections: true,
  },
  ghostWings: {
    enabled: true,
    autoMaterialize: false,         // Requires commander approval by default
    solidificationThreshold: 3,
    dissolutionThreshold: 2,
    maxLifespanHours: 72,
    coalescence: {
      enabled: true,
      autoCoalesce: false,            // Requires commander approval by default
      autoThreshold: 0.65,
      flagThreshold: 0.35,
    },
  },
  constellation: {
    enabled: true,
    provider: 'json',               // 'json' | 'lancedb'
    ragMaxEntries: 5,
    ragMinSimilarity: 0.15,
  },
  peers: {
    enabled: false,                   // Opt-in: multi-machine coordination
    heartbeatOnPulse: true,           // Send heartbeat on each autonomic pulse
    syncOnPulse: false,               // Sync constellation on each pulse (expensive)
    heartbeatTTLMinutes: 30,
  },
};

function mergeDefaults(config) {
  const ns = config.nervousSystem || {};
  return {
    ...NERVOUS_SYSTEM_DEFAULTS,
    ...ns,
    gravimetry: { ...NERVOUS_SYSTEM_DEFAULTS.gravimetry, ...(ns.gravimetry || {}) },
    autonomic: { ...NERVOUS_SYSTEM_DEFAULTS.autonomic, ...(ns.autonomic || {}) },
    ghostWings: {
      ...NERVOUS_SYSTEM_DEFAULTS.ghostWings,
      ...(ns.ghostWings || {}),
      coalescence: {
        ...NERVOUS_SYSTEM_DEFAULTS.ghostWings.coalescence,
        ...((ns.ghostWings || {}).coalescence || {}),
      },
    },
    constellation: { ...NERVOUS_SYSTEM_DEFAULTS.constellation, ...(ns.constellation || {}) },
    peers: { ...NERVOUS_SYSTEM_DEFAULTS.peers, ...(ns.peers || {}) },
  };
}

// ─── Nervous System Orchestrator ────────────────────────────────────────────

/**
 * Boot the complete nervous system.
 *
 * @param {object} options
 * @param {string} options.meshDir
 * @param {boolean} [options.daemon=false] - Start the autonomic metabolism loop
 * @returns {Promise<object>} nervous system instance
 */
async function bootNervousSystem(options = {}) {
  const meshDir = path.resolve(options.meshDir || '.mesh');
  const daemon = options.daemon || false;
  const emitter = new EventEmitter();

  // Load config
  const { config } = loadRuntimeConfig(meshDir);
  const nsConfig = mergeDefaults(config);

  if (!nsConfig.enabled) {
    return {
      enabled: false,
      reason: 'Nervous system disabled in config',
      triage: null,
      core: null,
      constellation: null,
    };
  }

  // ── Phase I: Semantic Gravimetry ──────────────────────────────────────

  const gravimetry = createGravimetryEngine({
    meshDir,
    provider: nsConfig.embeddingProvider,
    llmConfig: {
      provider: nsConfig.embeddingProvider,
      embeddingApiKey: nsConfig.embeddingApiKey,
      embeddingEndpoint: nsConfig.embeddingEndpoint,
      embeddingModel: nsConfig.embeddingModel,
      embeddingAppName: nsConfig.embeddingAppName,
      embeddingAppUrl: nsConfig.embeddingAppUrl,
    },
    thresholds: nsConfig.gravimetry,
  });

  // Calibrate with current departments
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  let departments = [];
  if (fs.existsSync(structurePath)) {
    try {
      const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      departments = Array.isArray(structure.departments) ? structure.departments : [];
    } catch {
      // Proceed without departments
    }
  }

  if (departments.length > 0) {
    await gravimetry.calibrate(departments);
  }

  // ── Phase IV: Constellation Memory ────────────────────────────────────

  let constellation = null;
  let embedFn = null;

  if (nsConfig.constellation.enabled) {
    // Create an embed function that reuses the gravimetry engine's internals
    if (nsConfig.embeddingProvider === 'tfidf') {
      const { tfidfVector, buildVocabulary } = require('./semantic-gravimetry.js');

      // Build vocabulary from all existing constellation content + department signatures
      const corpusTexts = departments.map((dept) => {
        const { buildWingSignature } = require('./semantic-gravimetry.js');
        return buildWingSignature(dept);
      });

      // We'll update the vocabulary as content grows
      let currentVocab = buildVocabulary(corpusTexts.length > 0 ? corpusTexts : ['mercury mesh placeholder']);

      embedFn = async (text) => {
        return tfidfVector(text, currentVocab);
      };
    } else {
      const { llmEmbed } = require('./semantic-gravimetry.js');
      embedFn = async (text) => {
        const [vector] = await llmEmbed([text], {
          provider: nsConfig.embeddingProvider,
          embeddingApiKey: nsConfig.embeddingApiKey,
          embeddingEndpoint: nsConfig.embeddingEndpoint,
          embeddingModel: nsConfig.embeddingModel,
          embeddingAppName: nsConfig.embeddingAppName,
          embeddingAppUrl: nsConfig.embeddingAppUrl,
        });
        return vector;
      };
    }

    constellation = await createConstellationStoreForProvider({
      meshDir,
      embedFn,
      provider: nsConfig.constellation.provider,
    });
  }

  // ── Phase II: Autonomic Core ──────────────────────────────────────────

  const core = createAutonomicCore({
    meshDir,
    pulseMs: nsConfig.autonomic.pulseMs,
    applyCorrections: nsConfig.autonomic.applyCorrections,
  });

  // ── Phase III: Ghost Wing Integration ─────────────────────────────────

  // Connect void detection (from triage) to Ghost Wing synthesis
  async function handleVoidSortie(sortie) {
    if (!nsConfig.ghostWings.enabled) return null;

    // Probe the gravity field for partial attractors
    const gravityField = gravimetry.isCalibrated
      ? await gravimetry.probe(`${sortie.title || ''}\n${sortie.body || ''}`)
      : [];

    const blueprint = synthesizeBlueprint(sortie, gravityField, departments);

    // Override thresholds from config
    blueprint.ghostMeta.solidificationThreshold = nsConfig.ghostWings.solidificationThreshold;
    blueprint.ghostMeta.dissolutionThreshold = nsConfig.ghostWings.dissolutionThreshold;
    blueprint.ghostMeta.maxLifespanHours = nsConfig.ghostWings.maxLifespanHours;

    emitter.emit('ghost-synthesized', blueprint);

    if (nsConfig.ghostWings.autoMaterialize) {
      const report = materialize(meshDir, blueprint, true);
      emitter.emit('ghost-materialized', report);

      // Recalibrate gravimetry to include new Ghost Wing
      departments.push(blueprint);
      await gravimetry.calibrate(departments);

      // Record in Constellation Memory
      if (constellation) {
        await constellation.recordGhostOutcome(blueprint.id, 'materialized', {
          domain: blueprint.domain,
          partialAttractors: blueprint.ghostMeta.partialAttractors,
          reason: `Auto-materialized Ghost Wing for sortie: "${sortie.title || 'unknown'}"`,
        });
      }

      return { blueprint, report, autoMaterialized: true };
    }

    return { blueprint, report: null, autoMaterialized: false };
  }

  // Connect Autonomic Core to Ghost Wing lifecycle evaluation
  core.on('pulse', (pulseResult) => {
    // Evaluate all Ghost Wings on each pulse
    const structureData = fs.existsSync(structurePath)
      ? JSON.parse(fs.readFileSync(structurePath, 'utf8'))
      : { departments: [] };

    const ghostWings = (structureData.departments || []).filter((d) => d._ghost);

    for (const ghost of ghostWings) {
      const evaluation = evaluateLifecycle(meshDir, ghost.id);

      if (evaluation.action === 'solidify') {
        solidify(meshDir, ghost.id);
        emitter.emit('ghost-solidified', { ghostId: ghost.id, reason: evaluation.reason });
      } else if (evaluation.action === 'dissolve') {
        dissolve(meshDir, ghost.id);
        emitter.emit('ghost-dissolved', { ghostId: ghost.id, reason: evaluation.reason });
      }
    }

    // Run coalescence scan after lifecycle evaluation
    if (nsConfig.ghostWings.coalescence.enabled && ghostWings.length >= 2) {
      const coalescenceReport = reconcileCoalescence(meshDir, {
        apply: nsConfig.ghostWings.coalescence.autoCoalesce,
        autoThreshold: nsConfig.ghostWings.coalescence.autoThreshold,
        flagThreshold: nsConfig.ghostWings.coalescence.flagThreshold,
      });

      if (coalescenceReport.coalesced.length > 0) {
        emitter.emit('ghosts-coalesced', coalescenceReport);
      }
      if (coalescenceReport.flagForReview > 0) {
        emitter.emit('coalescence-review-needed', coalescenceReport.flagged);
      }
    }
  });

  // ── Unified Triage ────────────────────────────────────────────────────

  /**
   * Semantic triage — the primary routing interface.
   *
   * 1. Compute gravity across all Wings
   * 2. If routable → return Wing(s)
   * 3. If void → synthesize Ghost Wing
   * 4. Augment context with Constellation Memory (RAG)
   *
   * @param {{ title: string, body: string }} issue
   * @returns {Promise<object>} routing decision
   */
  async function semanticTriage(issue) {
    if (!gravimetry.isCalibrated) {
      return {
        type: 'fallback',
        reason: 'Gravimetry not calibrated (no departments). Falling back to keyword routing.',
        ragContext: null,
      };
    }

    const decision = await gravimetry.triage(issue);

    // Augment with Constellation Memory
    let ragContext = null;
    if (constellation) {
      try {
        ragContext = await constellation.buildRAGContext(
          `${issue.title || ''}\n${issue.body || ''}`,
          {
            maxEntries: nsConfig.constellation.ragMaxEntries,
            minSimilarity: nsConfig.constellation.ragMinSimilarity,
          },
        );
      } catch {
        ragContext = null;
      }
    }

    // Handle void — trigger Ghost Wing synthesis
    if (decision.type === 'void') {
      const ghostResult = await handleVoidSortie(issue);
      return {
        ...decision,
        ghostWing: ghostResult,
        ragContext,
      };
    }

    return {
      ...decision,
      ragContext,
    };
  }

  // ── Boot Daemon ───────────────────────────────────────────────────────

  let fsWatcher = null;

  if (daemon) {
    core.boot();
    fsWatcher = core.watchFileSystem();

    // Register peer and start heartbeat if peers are enabled
    if (nsConfig.peers.enabled) {
      registerPeer(meshDir, { heartbeatTTLMinutes: nsConfig.peers.heartbeatTTLMinutes });

      core.on('pulse', () => {
        if (nsConfig.peers.heartbeatOnPulse) {
          peerHeartbeat(meshDir);
        }
        if (nsConfig.peers.syncOnPulse) {
          syncWithPeers(meshDir);
          emitter.emit('peers-synced');
        }
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    enabled: true,

    // Phase I
    gravimetry,
    semanticTriage,

    // Phase II
    core,
    scanWeather: () => scanDriftWeather(meshDir, config, departments),

    // Phase III
    handleVoidSortie,
    materializeGhostWing: (blueprint) => materialize(meshDir, blueprint, true),
    solidifyGhostWing: (ghostId) => solidify(meshDir, ghostId),
    dissolveGhostWing: (ghostId) => dissolve(meshDir, ghostId),
    scanCoalescence: (opts) => reconcileCoalescence(meshDir, opts),

    // Phase IV
    constellation,

    // Distributed Mesh
    peers: {
      register: (opts) => registerPeer(meshDir, { ...opts, heartbeatTTLMinutes: nsConfig.peers.heartbeatTTLMinutes }),
      heartbeat: () => peerHeartbeat(meshDir),
      classify: () => classifyPeers(meshDir),
      sync: (opts) => syncWithPeers(meshDir, opts),
    },

    // Events
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),

    // Lifecycle
    shutdown() {
      core.shutdown();
      if (fsWatcher) fsWatcher.close();
      emitter.emit('shutdown');
    },

    // Diagnostics
    diagnostics() {
      return {
        gravimetry: {
          calibrated: gravimetry.isCalibrated,
          wingCount: gravimetry.wingCount,
          provider: nsConfig.embeddingProvider,
        },
        autonomic: {
          running: core.isRunning,
          pulseCount: core.pulseCount,
          lastWeather: core.lastWeather,
        },
        ghostWings: {
          enabled: nsConfig.ghostWings.enabled,
          autoMaterialize: nsConfig.ghostWings.autoMaterialize,
          coalescence: nsConfig.ghostWings.coalescence,
        },
        constellation: constellation ? { ...constellation.stats(), provider: nsConfig.constellation.provider } : { enabled: false },
        peers: nsConfig.peers.enabled ? classifyPeers(meshDir) : { enabled: false },
      };
    },
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const meshDir = args.includes('--mesh-dir') ? args[args.indexOf('--mesh-dir') + 1] : (RUNTIME_DIR_CANDIDATES.find((c) => fs.existsSync(c)) || '.mesh');
  const daemon = args.includes('--daemon');
  const diagnosticsOnly = args.includes('--diagnostics');

  bootNervousSystem({ meshDir, daemon })
    .then((ns) => {
      if (diagnosticsOnly) {
        console.log(JSON.stringify(ns.diagnostics(), null, 2));
        ns.shutdown();
        return;
      }

      if (daemon) {
        console.log('[NERVOUS SYSTEM] All phases online. Metabolism running.');
        console.log(JSON.stringify(ns.diagnostics(), null, 2));

        process.on('SIGINT', () => { ns.shutdown(); process.exit(0); });
        process.on('SIGTERM', () => { ns.shutdown(); process.exit(0); });
      } else {
        console.log('[NERVOUS SYSTEM] Bootstrapped (non-daemon mode).');
        console.log(JSON.stringify(ns.diagnostics(), null, 2));
        ns.shutdown();
      }
    })
    .catch((err) => {
      console.error('[NERVOUS SYSTEM] Boot failure:', err.message);
      process.exit(1);
    });
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  bootNervousSystem,
  loadRuntimeConfig,
  mergeDefaults,
  NERVOUS_SYSTEM_DEFAULTS,
};
