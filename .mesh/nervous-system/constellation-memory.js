#!/usr/bin/env node
/**
 * Constellation Memory — Phase IV of the Mercury Mesh Nervous System
 *
 * A spatial memory architecture that replaces flat-file decision storage
 * with an embedded vector index. Every decision, Ghost Wing outcome,
 * and completed Burn is embedded as a coordinate in Constellation space.
 *
 * When a new Sortie is declared, the engine queries the Constellation
 * for structural resonance — retrieving tactical context from previous
 * missions to pre-load into Wing context windows.
 *
 * Storage: .mesh/nervous-system/constellation/
 *   - index.json     :: vector index (embeddings + metadata)
 *   - manifest.json  :: index statistics and schema version
 *
 * This is a self-contained, zero-dependency vector store. Upgrade path
 * to LanceDB or Chroma is supported via the provider interface.
 *
 * Depends on:
 *   - semantic-gravimetry.js (Phase I) for embedding computation
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const CONSTELLATION_DIR = 'constellation';
const INDEX_FILE = 'index.json';
const MANIFEST_FILE = 'manifest.json';
const SCHEMA_VERSION = 1;
const MAX_RESULTS_DEFAULT = 5;

// ─── Vector Operations ──────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function contentHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// ─── Memory Entry Types ─────────────────────────────────────────────────────

/**
 * @typedef {object} ConstellationEntry
 * @property {string} id - Unique hash of content
 * @property {string} type - 'decision' | 'ghost-outcome' | 'burn' | 'correction' | 'manual'
 * @property {string} content - Raw text content
 * @property {number[]} vector - Embedding vector
 * @property {object} metadata - Structured metadata
 * @property {string} timestamp - ISO timestamp
 */

// ─── Constellation Store ────────────────────────────────────────────────────

/**
 * Create a Constellation Memory store.
 *
 * @param {object} options
 * @param {string} options.meshDir - Path to .mesh/ runtime directory
 * @param {function} [options.embedFn] - Async function: (text) => number[]
 *   If not provided, entries must be inserted with pre-computed vectors.
 * @returns {object} store instance
 */
function createConstellationStore(options = {}) {
  const meshDir = path.resolve(options.meshDir || '.mesh');
  const storeDir = path.join(meshDir, 'nervous-system', CONSTELLATION_DIR);
  const indexPath = path.join(storeDir, INDEX_FILE);
  const manifestPath = path.join(storeDir, MANIFEST_FILE);
  const embedFn = options.embedFn || null;

  let entries = [];
  let manifest = {
    schemaVersion: SCHEMA_VERSION,
    entryCount: 0,
    lastUpdated: null,
    dimensions: null,
  };

  /**
   * Load the index from disk.
   */
  function load() {
    if (fs.existsSync(indexPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        entries = Array.isArray(raw) ? raw : [];
        // Reconstitute Float64Arrays from plain arrays for similarity computation
        for (const entry of entries) {
          if (Array.isArray(entry.vector)) {
            entry.vector = new Float64Array(entry.vector);
          }
        }
      } catch {
        entries = [];
      }
    }

    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        // Keep defaults
      }
    }
  }

  /**
   * Persist the index to disk.
   */
  function save() {
    fs.mkdirSync(storeDir, { recursive: true });

    // Convert Float64Arrays to plain arrays for JSON serialization
    const serializable = entries.map((entry) => ({
      ...entry,
      vector: Array.from(entry.vector),
    }));

    fs.writeFileSync(indexPath, JSON.stringify(serializable), 'utf8');

    manifest.entryCount = entries.length;
    manifest.lastUpdated = new Date().toISOString();
    if (entries.length > 0 && entries[0].vector) {
      manifest.dimensions = entries[0].vector.length;
    }

    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  /**
   * Embed and insert a memory entry.
   *
   * @param {object} entry
   * @param {string} entry.type - 'decision' | 'ghost-outcome' | 'burn' | 'correction' | 'manual'
   * @param {string} entry.content - Text to embed
   * @param {object} [entry.metadata] - Additional structured data
   * @param {number[]} [entry.vector] - Pre-computed vector (skips embedFn)
   */
  async function insert(entry) {
    const id = contentHash(entry.content);

    // Deduplicate
    if (entries.some((e) => e.id === id)) {
      return { inserted: false, reason: 'duplicate', id };
    }

    let vector = entry.vector;
    if (!vector && embedFn) {
      vector = await embedFn(entry.content);
    }

    if (!vector) {
      throw new Error('No vector provided and no embedFn configured. Cannot insert into Constellation.');
    }

    const record = {
      id,
      type: entry.type || 'manual',
      content: entry.content,
      vector: vector instanceof Float64Array ? vector : new Float64Array(vector),
      metadata: entry.metadata || {},
      timestamp: new Date().toISOString(),
    };

    entries.push(record);
    save();

    return { inserted: true, id };
  }

  /**
   * Query the Constellation for entries similar to the given text.
   * Returns the top-k most similar entries.
   *
   * @param {string|number[]} query - Text or pre-computed vector
   * @param {object} [options]
   * @param {number} [options.maxResults=5]
   * @param {number} [options.minSimilarity=0.1]
   * @param {string} [options.type] - Filter by entry type
   * @returns {Promise<Array<{entry: object, similarity: number}>>}
   */
  async function query(queryInput, queryOptions = {}) {
    const maxResults = queryOptions.maxResults || MAX_RESULTS_DEFAULT;
    const minSimilarity = queryOptions.minSimilarity || 0.1;
    const typeFilter = queryOptions.type || null;

    let queryVector;
    if (typeof queryInput === 'string') {
      if (!embedFn) {
        throw new Error('String query requires embedFn. Provide a pre-computed vector or configure embedFn.');
      }
      queryVector = await embedFn(queryInput);
    } else {
      queryVector = queryInput instanceof Float64Array ? queryInput : new Float64Array(queryInput);
    }

    let candidates = entries;
    if (typeFilter) {
      candidates = candidates.filter((e) => e.type === typeFilter);
    }

    const scored = candidates
      .map((entry) => ({
        entry: {
          id: entry.id,
          type: entry.type,
          content: entry.content,
          metadata: entry.metadata,
          timestamp: entry.timestamp,
        },
        similarity: cosineSimilarity(queryVector, entry.vector),
      }))
      .filter((result) => result.similarity >= minSimilarity);

    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, maxResults);
  }

  /**
   * Ingest all decisions from the Black Box (decisions.md and inbox/).
   * Parses decision entries and embeds them into the Constellation.
   *
   * @returns {Promise<{ingested: number, skipped: number}>}
   */
  async function ingestBlackBox() {
    const decisionsDir = path.join(meshDir, 'decisions', 'inbox');
    const decisionsMd = path.join(meshDir, 'decisions.md');
    let ingested = 0;
    let skipped = 0;

    // Ingest from inbox/
    if (fs.existsSync(decisionsDir)) {
      const files = fs.readdirSync(decisionsDir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8').trim();
        if (!content) continue;

        try {
          const result = await insert({
            type: 'decision',
            content,
            metadata: { source: `decisions/inbox/${file}` },
          });
          if (result.inserted) ingested++;
          else skipped++;
        } catch {
          skipped++;
        }
      }
    }

    // Ingest from decisions.md — parse ### headers as individual entries
    if (fs.existsSync(decisionsMd)) {
      const raw = fs.readFileSync(decisionsMd, 'utf8');
      const sections = raw.split(/(?=^### )/m).filter((s) => s.trim().startsWith('### '));

      for (const section of sections) {
        try {
          const result = await insert({
            type: 'decision',
            content: section.trim(),
            metadata: { source: 'decisions.md' },
          });
          if (result.inserted) ingested++;
          else skipped++;
        } catch {
          skipped++;
        }
      }
    }

    return { ingested, skipped };
  }

  /**
   * Record a Ghost Wing outcome (for Phase III integration).
   */
  async function recordGhostOutcome(ghostId, action, details) {
    const content = [
      `Ghost Wing ${action}: ${ghostId}`,
      details.reason || '',
      details.domain ? `Domain: ${details.domain.join(', ')}` : '',
      details.partialAttractors ? `Partial attractors: ${details.partialAttractors.map((a) => a.wingName).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return insert({
      type: 'ghost-outcome',
      content,
      metadata: { ghostId, action, ...details },
    });
  }

  /**
   * Build a RAG context block for a Sortie. Queries the Constellation
   * and formats results into a structured prompt fragment.
   *
   * @param {string} sortieText - Sortie title + body
   * @param {object} [ragOptions]
   * @returns {Promise<string>} formatted context block
   */
  async function buildRAGContext(sortieText, ragOptions = {}) {
    const maxEntries = ragOptions.maxEntries || 5;
    const minSimilarity = ragOptions.minSimilarity || 0.15;

    const results = await query(sortieText, {
      maxResults: maxEntries,
      minSimilarity,
    });

    if (results.length === 0) {
      return '<!-- Constellation Memory: No resonant entries found. Entering the Void. -->';
    }

    const lines = [
      '<!-- CONSTELLATION MEMORY :: RAG CONTEXT -->',
      '<!--',
      `  Resonant entries: ${results.length}`,
      `  Query similarity range: ${results[results.length - 1].similarity.toFixed(3)} – ${results[0].similarity.toFixed(3)}`,
      '-->',
      '',
    ];

    for (const result of results) {
      lines.push(`### [Resonance: ${(result.similarity * 100).toFixed(1)}%] ${result.entry.type}`);
      lines.push('');
      lines.push(result.entry.content.slice(0, 800));
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get store statistics.
   */
  function stats() {
    const typeCounts = {};
    for (const entry of entries) {
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    }

    return {
      totalEntries: entries.length,
      dimensions: manifest.dimensions,
      lastUpdated: manifest.lastUpdated,
      typeCounts,
    };
  }

  // Initialize
  load();

  return {
    insert,
    query,
    ingestBlackBox,
    recordGhostOutcome,
    buildRAGContext,
    stats,
    load,
    save,
    get entryCount() { return entries.length; },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

/**
 * Create a Constellation store using the configured provider.
 *
 * @param {object} options
 * @param {string} options.meshDir
 * @param {function} [options.embedFn]
 * @param {string} [options.provider='json'] - 'json' or 'lancedb'
 * @returns {Promise<object>} store instance
 */
async function createConstellationStoreForProvider(options = {}) {
  const provider = options.provider || 'json';

  if (provider === 'lancedb') {
    const { createConstellationStoreLanceDB, isLanceDBAvailable } = require('./constellation-lancedb.js');

    if (!(await isLanceDBAvailable())) {
      throw new Error(
        'Constellation provider "lancedb" configured but @lancedb/lancedb is not installed.\n' +
        'Install it: npm install @lancedb/lancedb\n' +
        'Or revert to JSON: set nervousSystem.constellation.provider to "json" in .mesh/config.json'
      );
    }

    const lanceStore = await createConstellationStoreLanceDB({
      meshDir: options.meshDir,
      embedFn: options.embedFn,
    });

    // Auto-migrate from JSON if LanceDB store is empty and JSON index exists
    if (lanceStore.entryCount === 0) {
      const jsonIndexPath = require('node:path').join(
        require('node:path').resolve(options.meshDir || '.mesh'),
        'nervous-system', 'constellation', 'index.json'
      );

      if (require('node:fs').existsSync(jsonIndexPath)) {
        try {
          const raw = JSON.parse(require('node:fs').readFileSync(jsonIndexPath, 'utf8'));
          if (Array.isArray(raw) && raw.length > 0) {
            const { migrated, skipped } = await lanceStore.migrateFromJSON(raw);
            if (typeof process !== 'undefined' && process.stderr) {
              process.stderr.write(`[constellation] Migrated ${migrated} entries from JSON to LanceDB (${skipped} skipped)\n`);
            }
          }
        } catch {
          // Migration failure is non-fatal; LanceDB starts empty
        }
      }
    }

    return lanceStore;
  }

  // Default: JSON provider (synchronous creation, wrapped in resolved promise)
  return createConstellationStore(options);
}

module.exports = {
  createConstellationStore,
  createConstellationStoreForProvider,
  cosineSimilarity,
  contentHash,
};
