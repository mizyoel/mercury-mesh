#!/usr/bin/env node
/**
 * Ghost Wing Coalescence — Overlap Detection & Auto-Merge
 *
 * When multiple Ghost Wings target overlapping files or domains,
 * they risk producing conflicting work. This module detects overlap
 * between active Ghost Wings and can:
 *
 *   1. Score conflict risk between pairs of Ghost Wings
 *   2. Auto-coalesce compatible Wings (merge into one, dissolve the other)
 *   3. Flag high-risk overlaps for Commander review
 *
 * Overlap signals:
 *   - Domain keyword intersection
 *   - Backlog file-path overlap (same files touched)
 *   - Partial attractor similarity (both attracted to the same permanent Wings)
 *
 * Coalescence = merging two Ghost Wings into one:
 *   - The wing with more successes absorbs the other
 *   - Backlogs are combined, domains are unioned
 *   - A decision is recorded in the inbox
 *
 * Depends on:
 *   - ghost-wing.js (Phase III) for lifecycle + structure access
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ─── Overlap Scoring ────────────────────────────────────────────────────────

/**
 * Compute Jaccard similarity between two sets.
 */
function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Extract file paths mentioned in a backlog markdown file.
 * Looks for code-like paths: anything matching \.ext patterns or src/ style refs.
 */
function extractFilePaths(backlogContent) {
  const paths = new Set();
  // Match file-like tokens: word/word.ext or word.ext patterns
  const re = /(?:[\w./-]+\/[\w./-]+|[\w-]+\.\w{1,8})/g;
  let m;
  while ((m = re.exec(backlogContent)) !== null) {
    paths.add(m[0]);
  }
  return paths;
}

/**
 * Score the overlap risk between two Ghost Wings.
 *
 * Returns a score from 0 (no overlap) to 1 (identical scope) plus
 * a breakdown of the individual signal strengths.
 *
 * @param {object} wingA - { id, domain, routingKeywords, ghostMeta, backlogContent }
 * @param {object} wingB - { id, domain, routingKeywords, ghostMeta, backlogContent }
 * @returns {{ score: number, signals: object }}
 */
function scoreOverlap(wingA, wingB) {
  // 1. Domain keyword overlap (weight: 0.4)
  const domainA = new Set(wingA.domain || []);
  const domainB = new Set(wingB.domain || []);
  const domainScore = jaccard(domainA, domainB);

  // 2. Routing keyword overlap (weight: 0.2)
  const kwA = new Set(wingA.routingKeywords || []);
  const kwB = new Set(wingB.routingKeywords || []);
  const keywordScore = jaccard(kwA, kwB);

  // 3. File path overlap from backlogs (weight: 0.3)
  const filesA = extractFilePaths(wingA.backlogContent || '');
  const filesB = extractFilePaths(wingB.backlogContent || '');
  const fileScore = jaccard(filesA, filesB);

  // 4. Shared partial attractors (weight: 0.1)
  const attractorsA = new Set((wingA.ghostMeta?.partialAttractors || []).map((a) => a.wingId));
  const attractorsB = new Set((wingB.ghostMeta?.partialAttractors || []).map((a) => a.wingId));
  const attractorScore = jaccard(attractorsA, attractorsB);

  const score =
    domainScore * 0.4 +
    keywordScore * 0.2 +
    fileScore * 0.3 +
    attractorScore * 0.1;

  return {
    score: Math.round(score * 1000) / 1000,
    signals: {
      domain: Math.round(domainScore * 1000) / 1000,
      keywords: Math.round(keywordScore * 1000) / 1000,
      files: Math.round(fileScore * 1000) / 1000,
      attractors: Math.round(attractorScore * 1000) / 1000,
    },
  };
}

// ─── Ghost Wing Discovery ───────────────────────────────────────────────────

/**
 * Load all active Ghost Wings from the org directory.
 *
 * @param {string} meshDir
 * @returns {Array<object>} Ghost Wing records with metadata
 */
function loadActiveGhosts(meshDir) {
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  if (!fs.existsSync(structurePath)) return [];

  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const ghosts = structure.departments.filter((d) => d._ghost);

  return ghosts.map((dept) => {
    const ghostDir = path.join(meshDir, 'org', dept.id);
    let ghostMeta = {};
    let backlogContent = '';

    const metaPath = path.join(ghostDir, 'ghost-meta.json');
    if (fs.existsSync(metaPath)) {
      ghostMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    const backlogPath = path.join(ghostDir, 'backlog.md');
    if (fs.existsSync(backlogPath)) {
      backlogContent = fs.readFileSync(backlogPath, 'utf8');
    }

    return {
      id: dept.id,
      name: dept.name,
      domain: dept.domain || [],
      routingKeywords: dept.routingKeywords || [],
      ghostMeta,
      backlogContent,
    };
  });
}

// ─── Overlap Detection ──────────────────────────────────────────────────────

/**
 * Detect all pairwise overlaps between active Ghost Wings.
 *
 * @param {string} meshDir
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.35] - Minimum overlap score to report
 * @returns {Array<{ wingA: string, wingB: string, score: number, signals: object }>}
 */
function detectOverlaps(meshDir, opts = {}) {
  const threshold = opts.threshold ?? 0.35;
  const ghosts = loadActiveGhosts(meshDir);
  const overlaps = [];

  for (let i = 0; i < ghosts.length; i++) {
    for (let j = i + 1; j < ghosts.length; j++) {
      const { score, signals } = scoreOverlap(ghosts[i], ghosts[j]);
      if (score >= threshold) {
        overlaps.push({
          wingA: ghosts[i].id,
          wingAName: ghosts[i].name,
          wingB: ghosts[j].id,
          wingBName: ghosts[j].name,
          score,
          signals,
        });
      }
    }
  }

  // Sort by score descending (highest conflict risk first)
  overlaps.sort((a, b) => b.score - a.score);
  return overlaps;
}

// ─── Auto-Coalescence ───────────────────────────────────────────────────────

// Thresholds for automatic action
const COALESCENCE_AUTO_THRESHOLD = 0.65; // Auto-merge without Commander approval
const COALESCENCE_FLAG_THRESHOLD = 0.35; // Flag for Commander review

/**
 * Coalesce two Ghost Wings — merge the weaker into the stronger.
 *
 * The "stronger" wing is the one with more successes (or if tied, the older one).
 * The weaker wing's backlog items and domain keywords are absorbed.
 * The weaker wing is then dissolved.
 *
 * @param {string} meshDir
 * @param {string} survivorId - Ghost Wing ID that absorbs the other
 * @param {string} absorbedId - Ghost Wing ID that gets dissolved
 * @returns {object} coalescence result
 */
function coalesce(meshDir, survivorId, absorbedId) {
  const ghostDir = (id) => path.join(meshDir, 'org', id);
  const structurePath = path.join(meshDir, 'org', 'structure.json');

  if (!fs.existsSync(structurePath)) {
    return { success: false, reason: 'structure.json not found' };
  }

  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const survivor = structure.departments.find((d) => d.id === survivorId);
  const absorbed = structure.departments.find((d) => d.id === absorbedId);

  if (!survivor || !absorbed) {
    return { success: false, reason: `One or both Ghost Wings not found: ${survivorId}, ${absorbedId}` };
  }

  if (!survivor._ghost || !absorbed._ghost) {
    return { success: false, reason: 'Both Wings must be Ghost Wings to coalesce' };
  }

  // 1. Merge domain keywords (union, deduplicated)
  const mergedDomain = [...new Set([...(survivor.domain || []), ...(absorbed.domain || [])])];
  const mergedKeywords = [...new Set([...(survivor.routingKeywords || []), ...(absorbed.routingKeywords || [])])];
  survivor.domain = mergedDomain;
  survivor.routingKeywords = mergedKeywords;

  // 2. Merge backlogs
  const survivorBacklogPath = path.join(ghostDir(survivorId), 'backlog.md');
  const absorbedBacklogPath = path.join(ghostDir(absorbedId), 'backlog.md');

  if (fs.existsSync(absorbedBacklogPath)) {
    const absorbedBacklog = fs.readFileSync(absorbedBacklogPath, 'utf8');
    // Extract table rows (skip header)
    const rows = absorbedBacklog
      .split('\n')
      .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('ID'))
      .map((line) => line.trim());

    if (rows.length > 0 && fs.existsSync(survivorBacklogPath)) {
      const survivorBacklog = fs.readFileSync(survivorBacklogPath, 'utf8');
      const merged = survivorBacklog.trimEnd() + '\n' + rows.join('\n') + '\n';
      fs.writeFileSync(survivorBacklogPath, merged, 'utf8');
    }
  }

  // 3. Merge ghost meta — combine success/failure counts
  const survivorMetaPath = path.join(ghostDir(survivorId), 'ghost-meta.json');
  const absorbedMetaPath = path.join(ghostDir(absorbedId), 'ghost-meta.json');

  if (fs.existsSync(survivorMetaPath) && fs.existsSync(absorbedMetaPath)) {
    const sMeta = JSON.parse(fs.readFileSync(survivorMetaPath, 'utf8'));
    const aMeta = JSON.parse(fs.readFileSync(absorbedMetaPath, 'utf8'));

    sMeta.successCount = (sMeta.successCount || 0) + (aMeta.successCount || 0);
    sMeta.failureCount = (sMeta.failureCount || 0) + (aMeta.failureCount || 0);

    // Merge partial attractors (deduplicate by wingId)
    const existingIds = new Set((sMeta.partialAttractors || []).map((a) => a.wingId));
    for (const att of aMeta.partialAttractors || []) {
      if (!existingIds.has(att.wingId)) {
        sMeta.partialAttractors.push(att);
      }
    }

    // Record absorption
    sMeta._absorbed = sMeta._absorbed || [];
    sMeta._absorbed.push({
      id: absorbedId,
      absorbedAt: new Date().toISOString(),
    });

    fs.writeFileSync(survivorMetaPath, JSON.stringify(sMeta, null, 2) + '\n', 'utf8');
  }

  // 4. Remove absorbed from structure
  const absorbedIdx = structure.departments.findIndex((d) => d.id === absorbedId);
  structure.departments.splice(absorbedIdx, 1);
  fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2) + '\n', 'utf8');

  // 5. Archive the absorbed wing's directory
  const absorbedDir = ghostDir(absorbedId);
  const archiveDir = path.join(meshDir, 'org', '_coalesced', absorbedId);

  if (fs.existsSync(absorbedDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    const files = fs.readdirSync(absorbedDir);
    for (const file of files) {
      fs.copyFileSync(path.join(absorbedDir, file), path.join(archiveDir, file));
    }
    for (const file of files) {
      fs.unlinkSync(path.join(absorbedDir, file));
    }
    fs.rmdirSync(absorbedDir);
  }

  // 6. Record decision
  recordCoalescenceDecision(meshDir, survivorId, absorbedId);

  return {
    success: true,
    survivorId,
    absorbedId,
    mergedDomainCount: mergedDomain.length,
    mergedKeywordCount: mergedKeywords.length,
  };
}

/**
 * Determine which wing should survive a coalescence.
 * Prefers the wing with more successes; breaks ties by age (older survives).
 */
function pickSurvivor(wingA, wingB) {
  const aSuccess = wingA.ghostMeta?.successCount || 0;
  const bSuccess = wingB.ghostMeta?.successCount || 0;

  if (aSuccess !== bSuccess) {
    return aSuccess >= bSuccess ? [wingA, wingB] : [wingB, wingA];
  }

  // Tie-break: older wing survives (lower hash → created first in practice)
  return wingA.id <= wingB.id ? [wingA, wingB] : [wingB, wingA];
}

// ─── Reconciliation Scan ────────────────────────────────────────────────────

/**
 * Full coalescence scan: detect overlaps, classify them, and optionally
 * auto-coalesce the high-confidence ones.
 *
 * @param {string} meshDir
 * @param {object} [opts]
 * @param {boolean} [opts.apply=false] - Actually perform auto-coalescence
 * @param {number} [opts.autoThreshold] - Override auto threshold
 * @param {number} [opts.flagThreshold] - Override flag threshold
 * @returns {object} scan report
 */
function reconcile(meshDir, opts = {}) {
  const apply = opts.apply ?? false;
  const autoThreshold = opts.autoThreshold ?? COALESCENCE_AUTO_THRESHOLD;
  const flagThreshold = opts.flagThreshold ?? COALESCENCE_FLAG_THRESHOLD;

  const ghosts = loadActiveGhosts(meshDir);
  const overlaps = detectOverlaps(meshDir, { threshold: flagThreshold });

  const autoCoalesce = [];
  const flagForReview = [];
  const coalesced = [];

  for (const overlap of overlaps) {
    if (overlap.score >= autoThreshold) {
      autoCoalesce.push(overlap);
    } else {
      flagForReview.push(overlap);
    }
  }

  // Apply auto-coalescence if requested
  if (apply) {
    // Track which wings have already been absorbed (can't absorb twice)
    const absorbed = new Set();

    for (const overlap of autoCoalesce) {
      if (absorbed.has(overlap.wingA) || absorbed.has(overlap.wingB)) continue;

      const wingA = ghosts.find((g) => g.id === overlap.wingA);
      const wingB = ghosts.find((g) => g.id === overlap.wingB);
      if (!wingA || !wingB) continue;

      const [survivor, absorb] = pickSurvivor(wingA, wingB);
      const result = coalesce(meshDir, survivor.id, absorb.id);

      if (result.success) {
        absorbed.add(absorb.id);
        coalesced.push({
          survivorId: survivor.id,
          absorbedId: absorb.id,
          score: overlap.score,
        });
      }
    }
  }

  return {
    ghostCount: ghosts.length,
    overlapCount: overlaps.length,
    autoCoalesce: autoCoalesce.length,
    flagForReview: flagForReview.length,
    coalesced,
    overlaps,
    flagged: flagForReview,
  };
}

// ─── Decision Recording ─────────────────────────────────────────────────────

function recordCoalescenceDecision(meshDir, survivorId, absorbedId) {
  const inboxDir = path.join(meshDir, 'decisions', 'inbox');
  fs.mkdirSync(inboxDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const slug = timestamp.replace(/[:.]/g, '-');
  const fileName = `coalescence-${survivorId}-absorbs-${absorbedId}-${slug}.md`;

  const entry = [
    `### ${timestamp}: Ghost Wing Coalescence`,
    '**By:** Ghost Wing Coalescence Engine (Nervous System)',
    `**Scope:** dept:${survivorId}, dept:${absorbedId}`,
    `**What:** Ghost Wing "${absorbedId}" coalesced into "${survivorId}". Domains merged, backlogs combined, meta unified.`,
    `**Why:** Overlap score exceeded auto-coalescence threshold. Merging reduces duplicate work and prevents file-level conflicts.`,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(inboxDir, fileName), entry, 'utf8');
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Scoring
  scoreOverlap,
  jaccard,
  extractFilePaths,

  // Detection
  loadActiveGhosts,
  detectOverlaps,

  // Coalescence
  coalesce,
  pickSurvivor,
  reconcile,

  // Constants
  COALESCENCE_AUTO_THRESHOLD,
  COALESCENCE_FLAG_THRESHOLD,
};
