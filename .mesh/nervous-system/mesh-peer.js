#!/usr/bin/env node
/**
 * Mesh Peer Registry — Distributed Mesh Phase 2
 *
 * Enables multi-machine coordination for Mercury Mesh. Each node
 * registers itself in a shared peer registry and periodically
 * announces its health state via heartbeats.
 *
 * Peer identity:
 *   - Node ID: deterministic hash of hostname + meshDir
 *   - Display name: hostname or user-supplied alias
 *   - Capabilities: which nervous system phases are active
 *
 * Discovery model:
 *   - File-based: peers share a Git-committed `.mesh/peers/` directory
 *   - Each peer writes its own manifest; reads others on sync
 *   - Stale peers (no heartbeat within TTL) are flagged
 *
 * Sync protocol:
 *   - Pull: read all peer manifests, merge constellation entries
 *   - Push: write local node manifest + constellation delta
 *   - Conflict resolution: last-writer-wins by timestamp
 *
 * Zero external dependencies — uses only Node built-ins + Git.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');

// ─── Node Identity ──────────────────────────────────────────────────────────

/**
 * Generate a deterministic node ID from hostname + meshDir.
 */
function generateNodeId(meshDir) {
  const input = `${os.hostname()}:${path.resolve(meshDir)}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

/**
 * Build the local node's identity manifest.
 */
function buildNodeManifest(meshDir, opts = {}) {
  const nodeId = generateNodeId(meshDir);
  const now = new Date().toISOString();

  // Detect active nervous system capabilities
  const capabilities = [];
  const nsDir = path.join(meshDir, 'nervous-system');

  const phaseFiles = {
    gravimetry: 'semantic-gravimetry.js',
    autonomic: 'autonomic-core.js',
    ghostWings: 'ghost-wing.js',
    constellation: 'constellation-memory.js',
    worktrees: 'worktree-manager.js',
    coalescence: 'ghost-coalescence.js',
  };

  for (const [cap, file] of Object.entries(phaseFiles)) {
    if (fs.existsSync(path.join(nsDir, file))) {
      capabilities.push(cap);
    }
  }

  // Read config for additional context
  let version = 'unknown';
  let halted = false;
  const configPath = path.join(meshDir, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      version = config.version || version;
      halted = config.halted || false;
    } catch { /* ignore */ }
  }

  // Count active departments
  let departmentCount = 0;
  let ghostCount = 0;
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  if (fs.existsSync(structurePath)) {
    try {
      const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      departmentCount = (structure.departments || []).length;
      ghostCount = (structure.departments || []).filter((d) => d._ghost).length;
    } catch { /* ignore */ }
  }

  return {
    nodeId,
    hostname: os.hostname(),
    alias: opts.alias || os.hostname(),
    meshDir: path.resolve(meshDir),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    meshVersion: version,
    halted,
    capabilities,
    departmentCount,
    ghostCount,
    registeredAt: opts.registeredAt || now,
    lastHeartbeat: now,
    heartbeatTTLMinutes: opts.heartbeatTTLMinutes || 30,
  };
}

// ─── Peer Registry ──────────────────────────────────────────────────────────

const PEERS_DIR = 'peers';

/**
 * Get the peers directory path.
 */
function peersDir(meshDir) {
  return path.join(meshDir, PEERS_DIR);
}

/**
 * Register (or update) the local node in the peer registry.
 */
function registerSelf(meshDir, opts = {}) {
  const manifest = buildNodeManifest(meshDir, opts);
  const dir = peersDir(meshDir);
  fs.mkdirSync(dir, { recursive: true });

  const manifestPath = path.join(dir, `${manifest.nodeId}.json`);

  // Preserve original registeredAt if already registered
  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.registeredAt = existing.registeredAt;
    } catch { /* ignore */ }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

/**
 * Send a heartbeat — update the local node's lastHeartbeat timestamp.
 */
function heartbeat(meshDir) {
  const nodeId = generateNodeId(meshDir);
  const manifestPath = path.join(peersDir(meshDir), `${nodeId}.json`);

  if (!fs.existsSync(manifestPath)) {
    // Auto-register if not yet registered
    return registerSelf(meshDir);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.lastHeartbeat = new Date().toISOString();

  // Refresh dynamic fields
  const fresh = buildNodeManifest(meshDir);
  manifest.halted = fresh.halted;
  manifest.departmentCount = fresh.departmentCount;
  manifest.ghostCount = fresh.ghostCount;
  manifest.capabilities = fresh.capabilities;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

/**
 * Load all registered peers.
 */
function listPeers(meshDir) {
  const dir = peersDir(meshDir);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Classify peers by health status.
 */
function classifyPeers(meshDir) {
  const peers = listPeers(meshDir);
  const now = Date.now();
  const localId = generateNodeId(meshDir);

  const healthy = [];
  const stale = [];
  const halted = [];

  for (const peer of peers) {
    peer._isLocal = peer.nodeId === localId;

    if (peer.halted) {
      halted.push(peer);
      continue;
    }

    const ttl = (peer.heartbeatTTLMinutes || 30) * 60_000;
    const lastBeat = new Date(peer.lastHeartbeat).getTime();
    const age = now - lastBeat;

    if (age > ttl) {
      peer._staleMinutes = Math.round(age / 60_000);
      stale.push(peer);
    } else {
      healthy.push(peer);
    }
  }

  return { peers, healthy, stale, halted, localId };
}

/**
 * Remove a peer from the registry.
 */
function removePeer(meshDir, nodeId) {
  const manifestPath = path.join(peersDir(meshDir), `${nodeId}.json`);
  if (!fs.existsSync(manifestPath)) {
    return { success: false, reason: `Peer ${nodeId} not found` };
  }
  fs.unlinkSync(manifestPath);
  return { success: true, nodeId };
}

/**
 * Prune stale peers that have exceeded their TTL.
 */
function pruneStalePeers(meshDir) {
  const { stale } = classifyPeers(meshDir);
  const removed = [];

  for (const peer of stale) {
    const result = removePeer(meshDir, peer.nodeId);
    if (result.success) {
      removed.push(peer.nodeId);
    }
  }

  return { pruned: removed.length, removed };
}

// ─── Constellation Sync ─────────────────────────────────────────────────────

/**
 * Export local constellation entries as a portable delta.
 *
 * Reads the local constellation store and produces a JSON-serializable
 * array of entries with their metadata for transmission to peers.
 */
function exportConstellationDelta(meshDir, opts = {}) {
  const since = opts.since ? new Date(opts.since).getTime() : 0;
  const storePath = path.join(meshDir, 'nervous-system', 'constellation', 'store.json');

  if (!fs.existsSync(storePath)) return { entries: [], exportedAt: new Date().toISOString() };

  try {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const entries = (store.entries || []).filter((e) => {
      if (!since) return true;
      const ts = new Date(e.timestamp || e.insertedAt || 0).getTime();
      return ts > since;
    });

    return {
      entries,
      exportedAt: new Date().toISOString(),
      sourceNodeId: generateNodeId(meshDir),
      totalCount: entries.length,
    };
  } catch {
    return { entries: [], exportedAt: new Date().toISOString() };
  }
}

/**
 * Import constellation entries from a peer's delta.
 *
 * Uses content hash deduplication — entries with the same hash
 * are skipped. New entries are appended.
 */
function importConstellationDelta(meshDir, delta) {
  if (!delta || !Array.isArray(delta.entries) || delta.entries.length === 0) {
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const storeDir = path.join(meshDir, 'nervous-system', 'constellation');
  fs.mkdirSync(storeDir, { recursive: true });
  const storePath = path.join(storeDir, 'store.json');

  let store = { entries: [] };
  if (fs.existsSync(storePath)) {
    try {
      store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    } catch { /* start fresh */ }
  }

  // Build hash index for deduplication
  const existingHashes = new Set(
    (store.entries || []).map((e) => e.contentHash).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of delta.entries) {
    try {
      if (entry.contentHash && existingHashes.has(entry.contentHash)) {
        skipped++;
        continue;
      }

      // Tag with source info
      const tagged = {
        ...entry,
        _importedFrom: delta.sourceNodeId || 'unknown',
        _importedAt: new Date().toISOString(),
      };

      store.entries.push(tagged);
      if (entry.contentHash) existingHashes.add(entry.contentHash);
      imported++;
    } catch {
      errors++;
    }
  }

  if (imported > 0) {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2) + '\n', 'utf8');
  }

  return { imported, skipped, errors };
}

// ─── Sync Orchestration ─────────────────────────────────────────────────────

/**
 * Full sync: export local + import from all peers.
 *
 * In the file-based model, peers share the same .mesh/ via Git.
 * This function assumes peer manifests are already visible (post-pull).
 *
 * For constellation sync, peers write deltas to .mesh/peers/{nodeId}-delta.json
 * and this function reads + imports them.
 */
function syncWithPeers(meshDir, opts = {}) {
  const localId = generateNodeId(meshDir);
  const dir = peersDir(meshDir);

  // 1. Update local heartbeat
  heartbeat(meshDir);

  // 2. Export local constellation delta
  const localDelta = exportConstellationDelta(meshDir, { since: opts.since });
  const deltaPath = path.join(dir, `${localId}-delta.json`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(deltaPath, JSON.stringify(localDelta, null, 2) + '\n', 'utf8');

  // 3. Import peer deltas
  const peerDeltas = fs.readdirSync(dir)
    .filter((f) => f.endsWith('-delta.json') && !f.startsWith(localId))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  let totalImported = 0;
  let totalSkipped = 0;
  const peerResults = [];

  for (const delta of peerDeltas) {
    const result = importConstellationDelta(meshDir, delta);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    peerResults.push({
      sourceNodeId: delta.sourceNodeId,
      imported: result.imported,
      skipped: result.skipped,
    });
  }

  return {
    localNodeId: localId,
    peersScanned: peerDeltas.length,
    constellationImported: totalImported,
    constellationSkipped: totalSkipped,
    peerResults,
    localDeltaExported: localDelta.totalCount,
    syncedAt: new Date().toISOString(),
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Identity
  generateNodeId,
  buildNodeManifest,

  // Registry
  registerSelf,
  heartbeat,
  listPeers,
  classifyPeers,
  removePeer,
  pruneStalePeers,

  // Constellation sync
  exportConstellationDelta,
  importConstellationDelta,
  syncWithPeers,
};
