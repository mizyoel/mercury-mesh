#!/usr/bin/env node
/**
 * Outrider — Void Cartographer
 *
 * Phase V.1 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * The Outrider scans the Void to discover adjacent architectures,
 * untamed problem spaces, and new feature trajectories. It does not
 * execute — it observes and scores.
 *
 * Perception channels:
 *   1. Constellation sparse zones (low-density embedding regions)
 *   2. Ghost Wing residue (dissolved ghost domain clusters)
 *   3. Commander pattern analysis (negative space around past missions)
 *   4. Void frequency log (repeated gravimetry routing misses)
 *
 * Output: Adjacency Map — scored list of expansion candidates.
 *
 * Authority: Fully autonomous. No Commander approval for scanning.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// ─── Constants ──────────────────────────────────────────────────────────────

const ADJACENCY_MAP_FILE = 'adjacency-map.json';
const SCAN_LOG_FILE = 'scan-log.json';
const SCHEMA_VERSION = 1;

const DEFAULT_WEIGHTS = {
  sparseZone: 0.30,
  ghostResidue: 0.25,
  patternProximity: 0.25,
  voidFrequency: 0.20,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateCandidateId(domain) {
  const sig = domain.sort().join('|');
  return 'adj-' + createHash('sha256').update(sig).digest('hex').slice(0, 8);
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

// ─── Channel 1: Constellation Sparse Zones ──────────────────────────────────

/**
 * Query the Constellation for regions with low entry density.
 * We generate domain probes from Ghost Wing keywords and check which
 * probes have few or no nearby entries.
 *
 * @param {object} constellation - Constellation store instance
 * @param {string[]} probeTerms - Domain terms to probe
 * @param {number} minSimilarity
 * @returns {Promise<Array<{terms: string[], density: number}>>}
 */
async function scanSparseZones(constellation, probeTerms, minSimilarity = 0.15) {
  if (!constellation || !constellation.query) return [];

  const zones = [];

  for (const term of probeTerms) {
    try {
      const results = await constellation.query(term, {
        maxResults: 5,
        minSimilarity,
      });
      zones.push({
        term,
        density: results.length / 5,
        resultCount: results.length,
      });
    } catch {
      zones.push({ term, density: 0, resultCount: 0 });
    }
  }

  return zones;
}

// ─── Channel 2: Ghost Wing Residue ──────────────────────────────────────────

/**
 * Scan dissolved Ghost Wings for domain clusters indicating
 * systemic capability gaps.
 *
 * @param {string} meshDir
 * @returns {Array<{domain: string[], ghostIds: string[], count: number}>}
 */
function scanGhostResidue(meshDir) {
  const orgDir = path.join(meshDir, 'org');
  if (!fs.existsSync(orgDir)) return [];

  const structurePath = path.join(orgDir, 'structure.json');
  const structure = readJsonSafe(structurePath);
  if (!structure) return [];

  // Look for dissolved ghost directories (have ghost-meta.json but not in active structure)
  const activeDeptIds = new Set((structure.departments || []).map((d) => d.id));
  const residue = [];

  let entries;
  try {
    entries = fs.readdirSync(orgDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('ghost-')) continue;

    // Only care about dissolved ghosts (not in active structure)
    if (activeDeptIds.has(entry.name)) continue;

    const metaPath = path.join(orgDir, entry.name, 'ghost-meta.json');
    const meta = readJsonSafe(metaPath);
    if (!meta) continue;

    const charterPath = path.join(orgDir, entry.name, 'charter.md');
    let domain = [];
    if (meta.domain) {
      domain = meta.domain;
    } else if (fs.existsSync(charterPath)) {
      // Try to extract domain from charter
      try {
        const charter = fs.readFileSync(charterPath, 'utf8');
        const domainMatch = charter.match(/## Domain\n\n([\s\S]*?)(?:\n##|\n$)/);
        if (domainMatch) {
          domain = domainMatch[1]
            .split('\n')
            .map((l) => l.replace(/^- /, '').trim())
            .filter(Boolean);
        }
      } catch {
        // ignore
      }
    }

    if (domain.length > 0) {
      residue.push({
        ghostId: entry.name,
        domain,
        failureCount: meta.failureCount || 0,
        dissolvedBy: meta.dissolvedBy || 'unknown',
      });
    }
  }

  // Cluster by domain overlap
  const clusters = new Map();
  for (const r of residue) {
    const key = r.domain.sort().join('|');
    if (!clusters.has(key)) {
      clusters.set(key, { domain: r.domain, ghostIds: [], count: 0 });
    }
    const cluster = clusters.get(key);
    cluster.ghostIds.push(r.ghostId);
    cluster.count++;
  }

  return [...clusters.values()];
}

// ─── Channel 3: Commander Pattern Analysis ──────────────────────────────────

/**
 * Analyze Constellation entries for Commander's historical patterns.
 * Extracts domain keywords from existing entries to identify what
 * domains are well-covered vs. sparse.
 *
 * @param {object} constellation
 * @param {object} options
 * @returns {Promise<{coveredDomains: string[], sparseDomains: string[]}>}
 */
async function analyzeCommanderPatterns(constellation, options = {}) {
  if (!constellation || !constellation.stats) {
    return { coveredDomains: [], sparseDomains: [] };
  }

  const stats = constellation.stats();
  if (stats.entryCount === 0) {
    return { coveredDomains: [], sparseDomains: [] };
  }

  // Get all entries by type to understand what domains the Commander operates in
  const typeMetrics = {};
  try {
    for (const type of ['decision', 'burn', 'ghost-outcome', 'correction']) {
      const results = await constellation.query(type, {
        maxResults: 10,
        minSimilarity: 0.05,
        type,
      });
      typeMetrics[type] = results.length;
    }
  } catch {
    // Constellation may not support type filtering
  }

  return {
    coveredDomains: Object.keys(typeMetrics).filter((t) => typeMetrics[t] > 3),
    sparseDomains: Object.keys(typeMetrics).filter((t) => typeMetrics[t] <= 1),
    totalEntries: stats.entryCount,
  };
}

// ─── Channel 4: Void Frequency ──────────────────────────────────────────────

/**
 * Count Void routing misses from the decisions inbox.
 * Ghost Wing synthesis events indicate Void hits.
 *
 * @param {string} meshDir
 * @returns {number} void hit count
 */
function countVoidFrequency(meshDir) {
  const inboxDir = path.join(meshDir, 'decisions', 'inbox');
  if (!fs.existsSync(inboxDir)) return 0;

  let count = 0;
  try {
    const files = fs.readdirSync(inboxDir);
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      try {
        const content = fs.readFileSync(path.join(inboxDir, f), 'utf8');
        if (content.includes('Ghost Wing') || content.includes('ghost-wing') || content.includes('void')) {
          count++;
        }
      } catch {
        // skip
      }
    }
  } catch {
    // no inbox
  }

  return count;
}

// ─── Adjacency Scoring ──────────────────────────────────────────────────────

/**
 * Score an adjacency candidate across all four channels.
 *
 * @param {object} signals
 * @param {number} signals.sparseZoneSignal - 0..1
 * @param {number} signals.ghostResidueSignal - 0..1
 * @param {number} signals.patternProximity - 0..1
 * @param {number} signals.voidFrequency - 0..1
 * @param {object} [weights] - Channel weights
 * @returns {number} Composite score 0..1
 */
function scoreAdjacency(signals, weights = DEFAULT_WEIGHTS) {
  return (
    (signals.sparseZoneSignal || 0) * weights.sparseZone +
    (signals.ghostResidueSignal || 0) * weights.ghostResidue +
    (signals.patternProximity || 0) * weights.patternProximity +
    (signals.voidFrequency || 0) * weights.voidFrequency
  );
}

// ─── Adjacency Map Management ───────────────────────────────────────────────

/**
 * Load the adjacency map from disk.
 *
 * @param {string} meshDir
 * @returns {object} adjacency map
 */
function loadAdjacencyMap(meshDir) {
  const mapPath = path.join(meshDir, 'vanguard', 'outrider', ADJACENCY_MAP_FILE);
  const existing = readJsonSafe(mapPath);
  return existing || {
    schemaVersion: SCHEMA_VERSION,
    lastScan: null,
    candidates: [],
  };
}

/**
 * Save the adjacency map to disk.
 *
 * @param {string} meshDir
 * @param {object} map
 */
function saveAdjacencyMap(meshDir, map) {
  const dir = path.join(meshDir, 'vanguard', 'outrider');
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, ADJACENCY_MAP_FILE),
    JSON.stringify(map, null, 2) + '\n',
    'utf8',
  );
}

/**
 * Append to the scan log.
 *
 * @param {string} meshDir
 * @param {object} entry
 */
function appendScanLog(meshDir, entry) {
  const dir = path.join(meshDir, 'vanguard', 'outrider');
  ensureDir(dir);
  const logPath = path.join(dir, SCAN_LOG_FILE);
  const log = readJsonSafe(logPath) || { scans: [] };
  log.scans.push(entry);
  // Keep last 50 scans
  if (log.scans.length > 50) {
    log.scans = log.scans.slice(-50);
  }
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n', 'utf8');
}

// ─── Main Scan Orchestrator ─────────────────────────────────────────────────

/**
 * Execute a full Outrider scan.
 *
 * @param {string} meshDir
 * @param {object} options
 * @param {object} [options.constellation] - Constellation store for sparse zone + pattern analysis
 * @param {object} [options.config] - Vanguard config section
 * @returns {Promise<object>} scan result
 */
async function scan(meshDir, options = {}) {
  const config = options.config || {};
  const outriderConfig = config.outrider || {};
  const constellation = options.constellation || null;
  const minimumScore = outriderConfig.minimumAdjacencyScore || 0.40;
  const maxCandidates = outriderConfig.maxCandidates || 20;
  const channels = outriderConfig.channels || {};

  const map = loadAdjacencyMap(meshDir);
  const existingIds = new Set(map.candidates.map((c) => c.id));

  // ── Collect signals from all channels ──
  const newCandidateSignals = [];

  // Channel 1: Ghost residue (always available — filesystem-based)
  let residueClusters = [];
  if (channels.ghostResidue !== false) {
    residueClusters = scanGhostResidue(meshDir);
  }

  // Channel 4: Void frequency (always available — filesystem-based)
  let voidCount = 0;
  if (channels.voidFrequency !== false) {
    voidCount = countVoidFrequency(meshDir);
  }

  // Channel 1: Constellation sparse zones
  let sparseZones = [];
  if (channels.sparseZones !== false && constellation) {
    // Generate probe terms from ghost residue + known department keywords
    const probeTerms = new Set();
    for (const cluster of residueClusters) {
      for (const d of cluster.domain) {
        probeTerms.add(d);
      }
    }
    // Also probe from existing structure departments
    const structurePath = path.join(meshDir, 'org', 'structure.json');
    const structure = readJsonSafe(structurePath);
    if (structure) {
      for (const dept of (structure.departments || [])) {
        for (const kw of (dept.routingKeywords || dept.domain || [])) {
          probeTerms.add(kw);
        }
      }
    }

    if (probeTerms.size > 0) {
      sparseZones = await scanSparseZones(
        constellation,
        [...probeTerms],
        outriderConfig.minimumGravity || 0.15,
      );
    }
  }

  // Channel 3: Commander patterns
  let commanderPatterns = { coveredDomains: [], sparseDomains: [], totalEntries: 0 };
  if (channels.commanderPatterns !== false && constellation) {
    commanderPatterns = await analyzeCommanderPatterns(constellation);
  }

  // ── Build candidates from ghost residue clusters ──
  for (const cluster of residueClusters) {
    const candidateId = generateCandidateId(cluster.domain);
    if (existingIds.has(candidateId)) continue;

    // Compute per-channel signals
    const sparseZoneSignal = sparseZones.length > 0
      ? 1 - (sparseZones.filter((z) => cluster.domain.includes(z.term)).reduce((sum, z) => sum + z.density, 0) / Math.max(cluster.domain.length, 1))
      : 0.5; // Default when no constellation

    const ghostResidueSignal = Math.min(cluster.count / 3, 1.0);

    const patternProximity = commanderPatterns.totalEntries > 0
      ? (commanderPatterns.sparseDomains.length > 0 ? 0.6 : 0.3)
      : 0.5; // Default when no constellation

    const voidFrequencySignal = Math.min(voidCount / 10, 1.0);

    const signals = {
      sparseZone: Math.round(sparseZoneSignal * 1000) / 1000,
      ghostResidue: Math.round(ghostResidueSignal * 1000) / 1000,
      patternProximity: Math.round(patternProximity * 1000) / 1000,
      voidFrequency: Math.round(voidFrequencySignal * 1000) / 1000,
    };

    const score = Math.round(scoreAdjacency({
      sparseZoneSignal,
      ghostResidueSignal,
      patternProximity,
      voidFrequency: voidFrequencySignal,
    }) * 1000) / 1000;

    if (score >= minimumScore) {
      newCandidateSignals.push({
        id: candidateId,
        domain: cluster.domain,
        inferredFrom: {
          ghostResidue: cluster.ghostIds,
          voidHits: voidCount,
        },
        score,
        signals,
        status: 'discovered',
        discoveredAt: new Date().toISOString(),
        promotedToExperiment: null,
      });
    }
  }

  // ── Merge new candidates into map ──
  for (const candidate of newCandidateSignals) {
    map.candidates.push(candidate);
    existingIds.add(candidate.id);
  }

  // Enforce max candidates — evict lowest scored
  if (map.candidates.length > maxCandidates) {
    map.candidates.sort((a, b) => b.score - a.score);
    map.candidates = map.candidates.slice(0, maxCandidates);
  }

  map.lastScan = new Date().toISOString();
  saveAdjacencyMap(meshDir, map);

  // Log the scan
  const scanEntry = {
    timestamp: map.lastScan,
    candidatesDiscovered: newCandidateSignals.length,
    totalCandidates: map.candidates.length,
    channels: {
      sparseZones: sparseZones.length,
      ghostResidue: residueClusters.length,
      voidFrequency: voidCount,
    },
  };
  appendScanLog(meshDir, scanEntry);

  return {
    timestamp: map.lastScan,
    newCandidates: newCandidateSignals,
    totalCandidates: map.candidates.length,
    map,
  };
}

/**
 * Dismiss an adjacency candidate.
 *
 * @param {string} meshDir
 * @param {string} candidateId
 * @returns {{ success: boolean, reason?: string }}
 */
function dismissCandidate(meshDir, candidateId) {
  const map = loadAdjacencyMap(meshDir);
  const candidate = map.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return { success: false, reason: `Candidate "${candidateId}" not found` };
  }
  candidate.status = 'dismissed';
  saveAdjacencyMap(meshDir, map);
  return { success: true };
}

/**
 * Promote a candidate to investigating status.
 *
 * @param {string} meshDir
 * @param {string} candidateId
 * @param {string} experimentId
 * @returns {{ success: boolean, reason?: string }}
 */
function promoteCandidate(meshDir, candidateId, experimentId) {
  const map = loadAdjacencyMap(meshDir);
  const candidate = map.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return { success: false, reason: `Candidate "${candidateId}" not found` };
  }
  candidate.status = 'promoted';
  candidate.promotedToExperiment = experimentId;
  saveAdjacencyMap(meshDir, map);
  return { success: true };
}

/**
 * Check if enough time has passed since last scan.
 *
 * @param {string} meshDir
 * @param {number} intervalHours
 * @returns {boolean}
 */
function shouldScan(meshDir, intervalHours = 24) {
  const map = loadAdjacencyMap(meshDir);
  if (!map.lastScan) return true;
  const elapsed = (Date.now() - new Date(map.lastScan).getTime()) / (1000 * 60 * 60);
  return elapsed >= intervalHours;
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  scan,
  shouldScan,
  loadAdjacencyMap,
  saveAdjacencyMap,
  dismissCandidate,
  promoteCandidate,
  scoreAdjacency,
  scanSparseZones,
  scanGhostResidue,
  countVoidFrequency,
  generateCandidateId,
};
