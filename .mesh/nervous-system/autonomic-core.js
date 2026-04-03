#!/usr/bin/env node
/**
 * Autonomic Core — Phase II of the Mercury Mesh Nervous System
 *
 * A persistent metabolism loop that replaces discrete CI-triggered
 * reconciliation. The Core continuously pulses, reading Drift Weather
 * across all state files, detecting context decay, and autonomously
 * firing micro-corrections.
 *
 * The Core does NOT replace CI entirely — it supplements it. CI workflows
 * remain the authoritative trigger for deployments and external events.
 * The Core handles the internal nervous system: heartbeat monitoring,
 * lease expiry, parallelism enforcement, and drift detection.
 *
 * Lifecycle:
 *   boot → calibrate gravimetry → pulse loop → [HALT sentinel] → shutdown
 *
 * Boot: node .mesh/nervous-system/autonomic-core.js --mesh-dir .mesh
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const RUNTIME_DIR_CANDIDATES = ['.mesh', '.mercury'];
const DEFAULT_PULSE_MS = 30_000; // 30 seconds
const DEFAULT_DECAY_THRESHOLD_MINUTES = 60;

// ─── Drift Weather Sensors ──────────────────────────────────────────────────

/**
 * Read a JSON file safely. Returns null on failure.
 */
function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Detect expired claim leases in a department state file.
 */
function detectExpiredLeases(stateData, now, leaseMinutes) {
  if (!stateData || !Array.isArray(stateData.claims)) return [];

  return stateData.claims.filter((claim) => {
    if (claim.status !== 'claimed') return false;
    if (!claim.leaseExpiry) return true;
    const expiry = new Date(claim.leaseExpiry);
    return now > expiry;
  });
}

/**
 * Detect stale heartbeats — agents that haven't reported within
 * the expected interval.
 */
function detectStaleHeartbeats(stateData, now, heartbeatMinutes) {
  if (!stateData || !stateData.lastHeartbeat) return false;
  const lastBeat = new Date(stateData.lastHeartbeat);
  const staleCutoff = new Date(now.getTime() - heartbeatMinutes * 60_000 * 2);
  return lastBeat < staleCutoff;
}

/**
 * Detect parallelism breaches — more active claims than allowed.
 */
function detectParallelismBreach(stateData, maxParallelism) {
  if (!stateData || !Array.isArray(stateData.claims)) return false;
  const activeClaims = stateData.claims.filter((c) => c.status === 'claimed').length;
  return activeClaims > maxParallelism;
}

/**
 * Detect context decay — state files that haven't been touched
 * within the decay threshold.
 */
function detectContextDecay(statePath, now, decayThresholdMinutes) {
  try {
    const stat = fs.statSync(statePath);
    const age = (now.getTime() - stat.mtimeMs) / 60_000;
    return age > decayThresholdMinutes;
  } catch {
    return true; // Missing state = fully decayed
  }
}

// ─── Drift Weather Report ───────────────────────────────────────────────────

/**
 * Scan all departments and produce a Drift Weather report.
 *
 * @param {string} meshDir
 * @param {object} config - config.json contents
 * @param {Array} departments - from org-structure.json
 * @returns {object} weather report
 */
function scanDriftWeather(meshDir, config, departments) {
  const now = new Date();
  const orgConfig = config.orgConfig || {};
  const defaultLease = orgConfig.claimLeaseMinutes || 30;
  const defaultHeartbeat = orgConfig.heartbeatMinutes || 15;
  const defaultMaxParallel = orgConfig.maxParallelismPerDepartment || 3;
  const decayThreshold = (config.nervousSystem && config.nervousSystem.contextDecayMinutes) || DEFAULT_DECAY_THRESHOLD_MINUTES;

  const departmentReports = [];
  let totalExpired = 0;
  let totalStale = 0;
  let totalBreaches = 0;
  let totalDecayed = 0;

  for (const dept of departments) {
    const runtime = dept.runtime || {};
    const statePath = path.resolve(meshDir, '..', runtime.statePath || `.mesh/org/${dept.id}/state.json`);
    const stateData = readJsonSafe(statePath);

    const leaseMinutes = runtime.claimLeaseMinutes || defaultLease;
    const heartbeatMinutes = runtime.heartbeatMinutes || defaultHeartbeat;
    const maxParallelism = runtime.maxParallelism || defaultMaxParallel;

    const expiredLeases = detectExpiredLeases(stateData, now, leaseMinutes);
    const staleHeartbeat = detectStaleHeartbeats(stateData, now, heartbeatMinutes);
    const parallelismBreach = detectParallelismBreach(stateData, maxParallelism);
    const contextDecayed = detectContextDecay(statePath, now, decayThreshold);

    const anomalies = [];
    if (expiredLeases.length > 0) anomalies.push(`${expiredLeases.length} expired lease(s)`);
    if (staleHeartbeat) anomalies.push('stale heartbeat');
    if (parallelismBreach) anomalies.push('parallelism breach');
    if (contextDecayed) anomalies.push('context decay');

    totalExpired += expiredLeases.length;
    if (staleHeartbeat) totalStale++;
    if (parallelismBreach) totalBreaches++;
    if (contextDecayed) totalDecayed++;

    departmentReports.push({
      departmentId: dept.id,
      departmentName: dept.name || dept.id,
      status: anomalies.length === 0 ? 'nominal' : 'anomaly',
      anomalies,
      expiredLeases,
      staleHeartbeat,
      parallelismBreach,
      contextDecayed,
    });
  }

  const hullIntegrity = departments.length > 0
    ? 1 - (departmentReports.filter((r) => r.status === 'anomaly').length / departments.length)
    : 1;

  return {
    timestamp: now.toISOString(),
    hullIntegrity,
    summary: {
      departmentsScanned: departments.length,
      totalExpiredLeases: totalExpired,
      totalStaleHeartbeats: totalStale,
      totalParallelismBreaches: totalBreaches,
      totalContextDecayed: totalDecayed,
    },
    departments: departmentReports,
    driftLevel: hullIntegrity >= 0.9 ? 'nominal' : hullIntegrity >= 0.7 ? 'elevated' : 'critical',
  };
}

// ─── Micro-Correction Actions ───────────────────────────────────────────────

/**
 * Re-queue expired claims back to 'queued' status.
 */
function requeueExpiredClaims(statePath, expiredLeases) {
  const stateData = readJsonSafe(statePath);
  if (!stateData || !Array.isArray(stateData.claims)) return 0;

  let count = 0;
  for (const claim of stateData.claims) {
    const expired = expiredLeases.find((e) => e.workItemId === claim.workItemId);
    if (expired) {
      claim.status = 'queued';
      claim.owner = null;
      claim.leaseExpiry = null;
      claim.requeuedAt = new Date().toISOString();
      claim.requeueReason = 'autonomic-core: lease expired';
      count++;
    }
  }

  if (count > 0) {
    fs.writeFileSync(statePath, `${JSON.stringify(stateData, null, 2)}\n`, 'utf8');
  }
  return count;
}

/**
 * Record a correction event in the decisions inbox.
 */
function recordCorrection(meshDir, correction) {
  const inboxDir = path.join(meshDir, 'decisions', 'inbox');
  fs.mkdirSync(inboxDir, { recursive: true });

  const slug = correction.departmentId || 'mesh';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `autonomic-${slug}-${timestamp}.md`;

  const entry = [
    `### ${new Date().toISOString()}: Autonomic correction — ${correction.type}`,
    '**By:** Autonomic Core (Nervous System)',
    `**Scope:** dept:${slug}`,
    `**What:** ${correction.description}`,
    `**Why:** ${correction.reason}`,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(inboxDir, fileName), entry, 'utf8');
}

// ─── Core Metabolism Loop ───────────────────────────────────────────────────

/**
 * Create the Autonomic Core.
 *
 * @param {object} options
 * @param {string} options.meshDir
 * @param {number} [options.pulseMs] - Metabolism interval in milliseconds
 * @param {boolean} [options.applyCorrections=false] - Whether to write corrections
 * @param {function} [options.onPulse] - Callback after each pulse
 * @param {function} [options.onCorrection] - Callback when a correction fires
 * @param {function} [options.onVoidDetected] - Callback when unroutable work is detected (Phase III hook)
 * @returns {object} core instance
 */
function createAutonomicCore(options = {}) {
  const meshDir = path.resolve(options.meshDir || '.mesh');
  const pulseMs = options.pulseMs || DEFAULT_PULSE_MS;
  const applyCorrections = options.applyCorrections !== false;
  const emitter = new EventEmitter();

  let running = false;
  let pulseTimer = null;
  let pulseCount = 0;
  let lastWeather = null;

  // Forward option callbacks to event emitter
  if (options.onPulse) emitter.on('pulse', options.onPulse);
  if (options.onCorrection) emitter.on('correction', options.onCorrection);
  if (options.onVoidDetected) emitter.on('void', options.onVoidDetected);

  function loadConfig() {
    return readJsonSafe(path.join(meshDir, 'config.json')) || {};
  }

  function loadDepartments() {
    const structurePath = path.join(meshDir, 'org', 'structure.json');
    const structure = readJsonSafe(structurePath);
    return structure && Array.isArray(structure.departments) ? structure.departments : [];
  }

  /**
   * Execute one pulse — the core metabolism cycle.
   */
  function pulse() {
    const config = loadConfig();

    // HALT Sentinel check
    if (config.halted) {
      emitter.emit('halted');
      return { halted: true, pulseCount };
    }

    const departments = loadDepartments();
    const weather = scanDriftWeather(meshDir, config, departments);
    lastWeather = weather;
    pulseCount++;

    const corrections = [];
    const orgConfig = config.orgConfig || {};
    const shouldRequeue = orgConfig.requeueExpiredClaims !== false;

    for (const report of weather.departments) {
      // Re-queue expired leases
      if (report.expiredLeases.length > 0 && shouldRequeue && applyCorrections) {
        const dept = departments.find((d) => d.id === report.departmentId);
        const runtime = (dept && dept.runtime) || {};
        const statePath = path.resolve(meshDir, '..', runtime.statePath || `.mesh/org/${report.departmentId}/state.json`);
        const count = requeueExpiredClaims(statePath, report.expiredLeases);

        if (count > 0) {
          const correction = {
            type: 'lease-requeue',
            departmentId: report.departmentId,
            description: `Re-queued ${count} expired claim(s) in ${report.departmentName}.`,
            reason: 'Claim lease expired without completion or heartbeat renewal.',
          };
          corrections.push(correction);
          recordCorrection(meshDir, correction);
          emitter.emit('correction', correction);
        }
      }

      // Context decay — emit for higher-level handling (Ghost Wing, etc.)
      if (report.contextDecayed) {
        emitter.emit('decay', {
          departmentId: report.departmentId,
          departmentName: report.departmentName,
        });
      }

      // Stale heartbeat warning
      if (report.staleHeartbeat) {
        const correction = {
          type: 'stale-heartbeat',
          departmentId: report.departmentId,
          description: `Wing "${report.departmentName}" has a stale heartbeat.`,
          reason: 'No heartbeat received within 2x the configured interval.',
        };
        corrections.push(correction);
        if (applyCorrections) {
          recordCorrection(meshDir, correction);
        }
        emitter.emit('correction', correction);
      }

      // Parallelism breach
      if (report.parallelismBreach) {
        const correction = {
          type: 'parallelism-breach',
          departmentId: report.departmentId,
          description: `Wing "${report.departmentName}" exceeds max parallelism.`,
          reason: 'Active claims exceed configured maxParallelism.',
        };
        corrections.push(correction);
        if (applyCorrections) {
          recordCorrection(meshDir, correction);
        }
        emitter.emit('correction', correction);
      }
    }

    const pulseResult = {
      pulseCount,
      weather,
      corrections,
      timestamp: new Date().toISOString(),
    };

    emitter.emit('pulse', pulseResult);
    return pulseResult;
  }

  /**
   * Boot the metabolism loop.
   */
  function boot() {
    if (running) return;

    const config = loadConfig();
    if (config.halted) {
      emitter.emit('halted');
      return;
    }

    running = true;
    emitter.emit('boot', { meshDir, pulseMs });

    // Immediate first pulse
    pulse();

    // Continuous metabolism
    pulseTimer = setInterval(() => {
      if (!running) return;
      pulse();
    }, pulseMs);

    // Unref so the timer doesn't keep the process alive if nothing else does
    if (pulseTimer.unref) pulseTimer.unref();
  }

  /**
   * Graceful shutdown.
   */
  function shutdown() {
    running = false;
    if (pulseTimer) {
      clearInterval(pulseTimer);
      pulseTimer = null;
    }
    emitter.emit('shutdown', { pulseCount });
  }

  /**
   * File system watcher — watches .mesh/ for state changes and
   * triggers an immediate pulse on relevant mutations.
   */
  function watchFileSystem() {
    const watchPaths = [
      path.join(meshDir, 'config.json'),
      path.join(meshDir, 'org'),
    ];

    const watchers = [];

    for (const watchPath of watchPaths) {
      if (!fs.existsSync(watchPath)) continue;

      try {
        const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (!running) return;
          if (!filename) return;

          // Debounce: only trigger on .json and .md changes
          if (!filename.endsWith('.json') && !filename.endsWith('.md')) return;

          emitter.emit('fileChange', { eventType, filename, watchPath });

          // Trigger an immediate pulse on state changes
          pulse();
        });

        watchers.push(watcher);
      } catch {
        // fs.watch may not be available on all platforms with recursive
      }
    }

    return {
      close() {
        for (const watcher of watchers) {
          watcher.close();
        }
      },
    };
  }

  return {
    boot,
    shutdown,
    pulse,
    watchFileSystem,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    get isRunning() { return running; },
    get lastWeather() { return lastWeather; },
    get pulseCount() { return pulseCount; },
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = {
    meshDir: RUNTIME_DIR_CANDIDATES.find((c) => fs.existsSync(c)) || '.mesh',
    pulseMs: DEFAULT_PULSE_MS,
    watch: false,
    once: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mesh-dir') { options.meshDir = argv[++i]; continue; }
    if (arg === '--pulse-ms') { options.pulseMs = Number(argv[++i]); continue; }
    if (arg === '--watch') { options.watch = true; continue; }
    if (arg === '--once') { options.once = true; continue; }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node .mesh/nervous-system/autonomic-core.js [--mesh-dir .mesh] [--pulse-ms 30000] [--watch] [--once]');
      process.exit(0);
    }
  }

  return options;
}

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  const core = createAutonomicCore({
    meshDir: opts.meshDir,
    pulseMs: opts.pulseMs,
    applyCorrections: true,
  });

  core.on('boot', (info) => {
    console.log(`[AUTONOMIC CORE] Metabolism online. Pulse interval: ${info.pulseMs}ms`);
  });

  core.on('pulse', (result) => {
    const w = result.weather;
    const drift = w.driftLevel.toUpperCase();
    const hull = (w.hullIntegrity * 100).toFixed(0);
    console.log(`[PULSE ${result.pulseCount}] Hull: ${hull}% | Drift: ${drift} | Corrections: ${result.corrections.length}`);
  });

  core.on('correction', (c) => {
    console.log(`  [CORRECTION] ${c.type} :: ${c.description}`);
  });

  core.on('halted', () => {
    console.log('[AUTONOMIC CORE] HALT Sentinel active. Metabolism suspended.');
  });

  core.on('shutdown', (info) => {
    console.log(`[AUTONOMIC CORE] Shutdown after ${info.pulseCount} pulses.`);
  });

  if (opts.once) {
    const result = core.pulse();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  core.boot();

  if (opts.watch) {
    const fsWatcher = core.watchFileSystem();
    process.on('SIGINT', () => {
      fsWatcher.close();
      core.shutdown();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      fsWatcher.close();
      core.shutdown();
      process.exit(0);
    });
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  createAutonomicCore,
  scanDriftWeather,
  detectExpiredLeases,
  detectStaleHeartbeats,
  detectParallelismBreach,
  detectContextDecay,
  requeueExpiredClaims,
  recordCorrection,
};
