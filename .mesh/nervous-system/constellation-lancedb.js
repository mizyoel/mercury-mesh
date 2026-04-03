#!/usr/bin/env node
/**
 * Constellation Memory — LanceDB Provider
 *
 * Drop-in replacement for the JSON vector store that uses LanceDB
 * for disk-backed, indexed vector search. Same public API as
 * createConstellationStore() so the orchestrator can swap providers
 * via config.
 *
 * Storage: .mesh/nervous-system/constellation-lancedb/
 *   - LanceDB managed files (lance format)
 *
 * Requires: @lancedb/lancedb (optional peer dependency)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const LANCEDB_DIR = 'constellation-lancedb';
const TABLE_NAME = 'constellation';
const MAX_RESULTS_DEFAULT = 5;

function contentHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Dynamically import @lancedb/lancedb (ESM module from CommonJS).
 * Returns null if the package is not installed.
 */
let _lancedbModule = undefined; // undefined = not attempted, null = unavailable

async function loadLanceDB() {
  if (_lancedbModule !== undefined) return _lancedbModule;
  try {
    _lancedbModule = await import('@lancedb/lancedb');
    return _lancedbModule;
  } catch {
    _lancedbModule = null;
    return null;
  }
}

/**
 * Check whether @lancedb/lancedb is available without connecting.
 */
async function isLanceDBAvailable() {
  const mod = await loadLanceDB();
  return mod !== null;
}

/**
 * Create a Constellation Memory store backed by LanceDB.
 *
 * @param {object} options
 * @param {string} options.meshDir - Path to .mesh/ runtime directory
 * @param {function} [options.embedFn] - Async function: (text) => number[]
 * @returns {Promise<object>} store instance (same API as JSON store)
 */
async function createConstellationStoreLanceDB(options = {}) {
  const lancedb = await loadLanceDB();
  if (!lancedb) {
    throw new Error(
      'LanceDB is not installed. Install it with: npm install @lancedb/lancedb\n' +
      'Or switch to JSON provider: set constellation.provider to "json" in .mesh/config.json'
    );
  }

  const meshDir = path.resolve(options.meshDir || '.mesh');
  const storeDir = path.join(meshDir, 'nervous-system', LANCEDB_DIR);
  const embedFn = options.embedFn || null;

  fs.mkdirSync(storeDir, { recursive: true });

  const db = await lancedb.connect(storeDir);

  // Check if table exists
  const tableNames = await db.tableNames();
  let table;

  if (tableNames.includes(TABLE_NAME)) {
    table = await db.openTable(TABLE_NAME);
  } else {
    table = null; // Created lazily on first insert
  }

  let _entryCount = 0;
  let _dimensions = null;
  let _lastUpdated = null;

  // Load counts from existing data
  if (table) {
    try {
      _entryCount = await table.countRows();
    } catch {
      _entryCount = 0;
    }
  }

  /**
   * Ensure the table exists, creating it with the first entry if needed.
   */
  async function ensureTable(record) {
    if (table) return;

    table = await db.createTable(TABLE_NAME, [record]);
    _entryCount = 1;
    _dimensions = record.vector.length;
    _lastUpdated = record.timestamp;
  }

  /**
   * Convert Float64Array to plain Array<number> for LanceDB (uses Float32 internally).
   */
  function vectorToArray(v) {
    if (v instanceof Float64Array || v instanceof Float32Array) {
      return Array.from(v);
    }
    return Array.isArray(v) ? v : Array.from(v);
  }

  /**
   * Build a LanceDB-compatible row from a constellation entry.
   */
  function toRow(entry) {
    return {
      id: entry.id,
      type: entry.type,
      content: entry.content,
      vector: vectorToArray(entry.vector),
      metadata: JSON.stringify(entry.metadata || {}),
      timestamp: entry.timestamp,
    };
  }

  /**
   * Convert a LanceDB result row back to constellation entry format.
   */
  function fromRow(row) {
    let metadata = {};
    try {
      metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
    } catch {
      metadata = {};
    }
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      metadata,
      timestamp: row.timestamp,
    };
  }

  /**
   * Check for duplicate by id.
   */
  async function hasDuplicate(id) {
    if (!table) return false;
    try {
      const results = await table.query().where(`id = '${id.replace(/'/g, "''")}'`).limit(1).toArray();
      return results.length > 0;
    } catch {
      return false;
    }
  }

  // ── Public API (matches JSON store interface) ─────────────────────────

  async function insert(entry) {
    const id = contentHash(entry.content);

    if (await hasDuplicate(id)) {
      return { inserted: false, reason: 'duplicate', id };
    }

    let vector = entry.vector;
    if (!vector && embedFn) {
      vector = await embedFn(entry.content);
    }

    if (!vector) {
      throw new Error('No vector provided and no embedFn configured. Cannot insert into Constellation.');
    }

    const record = toRow({
      id,
      type: entry.type || 'manual',
      content: entry.content,
      vector,
      metadata: entry.metadata || {},
      timestamp: new Date().toISOString(),
    });

    if (!table) {
      await ensureTable(record);
    } else {
      await table.add([record]);
      _entryCount++;
    }

    _dimensions = record.vector.length;
    _lastUpdated = record.timestamp;

    return { inserted: true, id };
  }

  async function query(queryInput, queryOptions = {}) {
    if (!table || _entryCount === 0) return [];

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
      queryVector = queryInput;
    }

    const searchVector = vectorToArray(queryVector);

    let search = table.vectorSearch(searchVector).distanceType('cosine').limit(maxResults * 2);

    if (typeFilter) {
      search = search.where(`type = '${typeFilter.replace(/'/g, "''")}'`);
    }

    const raw = await search.toArray();

    // LanceDB cosine distance: 0 = identical, 2 = opposite.
    // Convert to similarity: similarity = 1 - (distance / 2)
    // But LanceDB cosine_distance = 1 - cosine_similarity, so similarity = 1 - distance
    const results = raw
      .map((row) => {
        const distance = row._distance != null ? row._distance : 0;
        const similarity = 1 - distance;
        return {
          entry: fromRow(row),
          similarity,
        };
      })
      .filter((r) => r.similarity >= minSimilarity);

    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, maxResults);
  }

  async function ingestBlackBox() {
    const decisionsDir = path.join(meshDir, 'decisions', 'inbox');
    const decisionsMd = path.join(meshDir, 'decisions.md');
    let ingested = 0;
    let skipped = 0;

    if (fs.existsSync(decisionsDir)) {
      const files = fs.readdirSync(decisionsDir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8').trim();
        if (!content) continue;
        try {
          const result = await insert({ type: 'decision', content, metadata: { source: `decisions/inbox/${file}` } });
          if (result.inserted) ingested++;
          else skipped++;
        } catch {
          skipped++;
        }
      }
    }

    if (fs.existsSync(decisionsMd)) {
      const raw = fs.readFileSync(decisionsMd, 'utf8');
      const sections = raw.split(/(?=^### )/m).filter((s) => s.trim().startsWith('### '));
      for (const section of sections) {
        try {
          const result = await insert({ type: 'decision', content: section.trim(), metadata: { source: 'decisions.md' } });
          if (result.inserted) ingested++;
          else skipped++;
        } catch {
          skipped++;
        }
      }
    }

    return { ingested, skipped };
  }

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

  async function buildRAGContext(sortieText, ragOptions = {}) {
    const maxEntries = ragOptions.maxEntries || 5;
    const minSimilarity = ragOptions.minSimilarity || 0.15;

    const results = await query(sortieText, { maxResults: maxEntries, minSimilarity });

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

  function stats() {
    return {
      totalEntries: _entryCount,
      dimensions: _dimensions,
      lastUpdated: _lastUpdated,
      provider: 'lancedb',
      typeCounts: {}, // Requires full scan; populated on demand
    };
  }

  /**
   * Get detailed stats including type counts (more expensive).
   */
  async function detailedStats() {
    if (!table || _entryCount === 0) {
      return { ...stats(), typeCounts: {} };
    }

    const allRows = await table.query().select(['type']).toArray();
    const typeCounts = {};
    for (const row of allRows) {
      typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
    }

    return { ...stats(), typeCounts };
  }

  /**
   * Migrate entries from the JSON constellation store.
   * Used when switching from 'json' to 'lancedb' provider.
   *
   * @param {Array<object>} entries - Array of ConstellationEntry objects (with vector arrays)
   * @returns {Promise<{migrated: number, skipped: number}>}
   */
  async function migrateFromJSON(entries) {
    let migrated = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (!entry.vector || !entry.content) {
        skipped++;
        continue;
      }

      const id = contentHash(entry.content);
      if (await hasDuplicate(id)) {
        skipped++;
        continue;
      }

      const record = toRow({
        id,
        type: entry.type || 'manual',
        content: entry.content,
        vector: entry.vector,
        metadata: entry.metadata || {},
        timestamp: entry.timestamp || new Date().toISOString(),
      });

      if (!table) {
        await ensureTable(record);
      } else {
        await table.add([record]);
        _entryCount++;
      }

      migrated++;
    }

    if (migrated > 0) {
      _lastUpdated = new Date().toISOString();
    }

    return { migrated, skipped };
  }

  return {
    insert,
    query,
    ingestBlackBox,
    recordGhostOutcome,
    buildRAGContext,
    stats,
    detailedStats,
    migrateFromJSON,
    get entryCount() { return _entryCount; },
  };
}

module.exports = {
  createConstellationStoreLanceDB,
  isLanceDBAvailable,
  contentHash,
};
