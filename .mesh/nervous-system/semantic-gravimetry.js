#!/usr/bin/env node
/**
 * Semantic Gravimetry — Phase I of the Mercury Mesh Nervous System
 *
 * Replaces keyword-based routing with intent-based gravitational routing.
 * Work items are projected into semantic space and matched against Wing
 * domain signatures. When gravity is distributed across multiple Wings,
 * an Airbridge is formed automatically.
 *
 * Embedding providers are pluggable:
 *   - 'openrouter' → OpenRouter embeddings API
 *   - 'llm'        → Legacy OpenAI-compatible endpoint override
 *   - 'tfidf'      → Built-in TF-IDF vectorizer (zero-dependency fallback)
 *
 * Every routing decision records its gravity field in the decision trail
 * for Constellation Memory ingestion (Phase IV).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { createHash } = require('node:crypto');

// ─── TF-IDF Vectorizer (zero-dependency fallback) ──────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'although', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildVocabulary(documents) {
  const df = new Map();
  const allTokens = new Set();

  for (const doc of documents) {
    const tokens = new Set(tokenize(doc));
    for (const token of tokens) {
      allTokens.add(token);
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const vocab = [...allTokens].sort();
  const tokenIndex = new Map();
  for (let i = 0; i < vocab.length; i++) {
    tokenIndex.set(vocab[i], i);
  }

  return { vocab, tokenIndex, df, docCount: documents.length };
}

function tfidfVector(text, vocabulary) {
  const tokens = tokenize(text);
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const vector = new Float64Array(vocabulary.vocab.length);
  const docCount = vocabulary.docCount || 1;

  for (const [token, count] of tf) {
    const index = vocabulary.tokenIndex.get(token);
    if (index === undefined) continue;

    const termFreq = count / tokens.length;
    const inverseDocFreq = Math.log((docCount + 1) / ((vocabulary.df.get(token) || 0) + 1)) + 1;
    vector[index] = termFreq * inverseDocFreq;
  }

  return vector;
}

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

// ─── External Embedding Providers ──────────────────────────────────────────

function resolveEmbeddingProviderConfig(provider, config = {}) {
  if (provider === 'openrouter') {
    const apiKey = config.embeddingApiKey;

    if (!apiKey) {
      throw new Error('Semantic Gravimetry: No OpenRouter API key. Configure nervousSystem.embeddingApiKey in .mesh/local.json or set OPENROUTER_API_KEY env var.');
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'mercury-mesh-gravimetry',
      'X-OpenRouter-Title': config.embeddingAppName || 'Mercury Mesh',
    };

    if (config.embeddingAppUrl) {
      headers['HTTP-Referer'] = config.embeddingAppUrl;
    }

    return {
      endpoint: config.embeddingEndpoint || 'https://openrouter.ai/api/v1/embeddings',
      model: config.embeddingModel || 'openai/text-embedding-3-small',
      headers,
    };
  }

  if (provider === 'llm') {
    const apiKey = config.embeddingApiKey;

    if (!apiKey) {
      throw new Error('Semantic Gravimetry: No embedding API key. Configure nervousSystem.embeddingApiKey in .mesh/local.json or set OPENAI_API_KEY env var.');
    }

    return {
      endpoint: config.embeddingEndpoint || 'https://api.openai.com/v1/embeddings',
      model: config.embeddingModel || 'text-embedding-3-small',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'mercury-mesh-gravimetry',
      },
    };
  }

  throw new Error(`Semantic Gravimetry: Unsupported embedding provider "${provider}".`);
}

function llmEmbed(texts, config = {}) {
  const provider = config.provider || 'llm';
  const resolved = resolveEmbeddingProviderConfig(provider, config);
  const url = new URL(resolved.endpoint);
  const payload = JSON.stringify({ input: texts, model: resolved.model });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: resolved.headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`Embedding API ${res.statusCode}: ${body.slice(0, 500)}`));
            return;
          }
          try {
            const data = JSON.parse(body);
            const embeddings = data.data.map((d) => new Float64Array(d.embedding));
            resolve(embeddings);
          } catch (err) {
            reject(new Error(`Failed to parse embedding response: ${err.message}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

// ─── Embedding Cache ────────────────────────────────────────────────────────

function embeddingCacheKey(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function loadEmbeddingCache(cachePath) {
  if (!fs.existsSync(cachePath)) return new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const map = new Map();
    for (const [key, arr] of Object.entries(raw)) {
      map.set(key, new Float64Array(arr));
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveEmbeddingCache(cachePath, cache) {
  const obj = {};
  for (const [key, vec] of cache) {
    obj[key] = Array.from(vec);
  }
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(obj), 'utf8');
}

// ─── Wing Domain Signatures ────────────────────────────────────────────────

function buildWingSignature(department) {
  const parts = [
    department.name || department.id,
    ...(department.domain || []),
    ...(department.routingKeywords || []),
    department.leadStyle || '',
  ];

  const authority = department.authority || {};
  if (authority.canDecideLocally) {
    parts.push(...authority.canDecideLocally);
  }

  return parts.filter(Boolean).join(' ').trim();
}

function buildSortieSignature(issue) {
  return `${issue.title || ''}\n${issue.body || ''}`.trim();
}

// ─── Gravity Field Computation ──────────────────────────────────────────────

/**
 * Compute the gravitational field of a Sortie across all Wings.
 *
 * Returns an array of { department, similarity, gravityShare } sorted
 * by descending similarity. gravityShare is the normalized proportion
 * of total gravity each Wing captures.
 *
 * @param {Float64Array} sortieVector - Embedding of the incoming work
 * @param {Array<{department: object, vector: Float64Array}>} wingVectors
 * @returns {Array<{department: object, similarity: number, gravityShare: number}>}
 */
function computeGravityField(sortieVector, wingVectors) {
  const raw = wingVectors.map(({ department, vector }) => ({
    department,
    similarity: cosineSimilarity(sortieVector, vector),
  }));

  // Filter out negative/zero similarity — these Wings exert no pull
  const attracted = raw.filter((entry) => entry.similarity > 0);

  if (attracted.length === 0) {
    return raw.map((entry) => ({ ...entry, gravityShare: 0 }));
  }

  const totalGravity = attracted.reduce((sum, entry) => sum + entry.similarity, 0);

  const field = attracted.map((entry) => ({
    ...entry,
    gravityShare: totalGravity > 0 ? entry.similarity / totalGravity : 0,
  }));

  field.sort((a, b) => b.similarity - a.similarity);
  return field;
}

/**
 * Determine routing decision from a gravity field.
 *
 * Rules:
 *   - If the top Wing captures >= airbridgeThreshold of total gravity → single route
 *   - If gravity is distributed → declare an Airbridge between all Wings
 *     that each capture >= airbridgeMinShare
 *   - If no Wing exceeds minimumGravity → route to the Void (uncharted)
 *
 * @param {Array} gravityField - Output of computeGravityField
 * @param {object} thresholds
 * @returns {{ type: string, wings: Array, reason: string, field: Array }}
 */
function resolveGravity(gravityField, thresholds = {}) {
  const minimumGravity = thresholds.minimumGravity || 0.15;
  const airbridgeThreshold = thresholds.airbridgeThreshold || 0.70;
  const airbridgeMinShare = thresholds.airbridgeMinShare || 0.20;

  const viable = gravityField.filter((entry) => entry.similarity >= minimumGravity);

  if (viable.length === 0) {
    return {
      type: 'void',
      wings: [],
      reason: `No Wing exceeds minimum gravity threshold (${minimumGravity}). Sortie enters the Void.`,
      field: gravityField,
    };
  }

  const top = viable[0];

  if (top.gravityShare >= airbridgeThreshold) {
    return {
      type: 'direct',
      wings: [top.department],
      primaryGravity: top.similarity,
      reason: `Wing "${top.department.name || top.department.id}" captures ${(top.gravityShare * 100).toFixed(1)}% gravity — direct route.`,
      field: gravityField,
    };
  }

  // Distributed gravity → Airbridge
  const bridgedWings = viable.filter((entry) => entry.gravityShare >= airbridgeMinShare);

  if (bridgedWings.length <= 1) {
    // Only one Wing has meaningful share despite threshold — direct route
    return {
      type: 'direct',
      wings: [top.department],
      primaryGravity: top.similarity,
      reason: `Wing "${top.department.name || top.department.id}" is sole viable attractor (${(top.gravityShare * 100).toFixed(1)}% gravity).`,
      field: gravityField,
    };
  }

  const shares = bridgedWings.map(
    (w) => `${w.department.name || w.department.id}: ${(w.gravityShare * 100).toFixed(1)}%`,
  );

  return {
    type: 'airbridge',
    wings: bridgedWings.map((w) => w.department),
    gravityDistribution: bridgedWings.map((w) => ({
      wing: w.department.name || w.department.id,
      share: w.gravityShare,
      similarity: w.similarity,
    })),
    reason: `Gravity distributed across ${bridgedWings.length} Wings — Airbridge formed. [${shares.join(', ')}]`,
    field: gravityField,
  };
}

// ─── Semantic Triage Engine ─────────────────────────────────────────────────

/**
 * Create a Semantic Gravimetry engine.
 *
 * @param {object} options
 * @param {string} options.meshDir - Path to .mesh/ runtime directory
 * @param {string} [options.provider='tfidf'] - Embedding provider: 'tfidf', 'openrouter', or legacy 'llm'
 * @param {object} [options.llmConfig] - LLM embedding configuration
 * @param {object} [options.thresholds] - Gravity resolution thresholds
 * @returns {object} engine instance
 */
function createGravimetryEngine(options = {}) {
  const meshDir = options.meshDir || '.mesh';
  const provider = options.provider || 'tfidf';
  const llmConfig = options.llmConfig || {};
  const thresholds = options.thresholds || {};
  const cachePath = path.join(meshDir, 'nervous-system', '.embedding-cache.json');

  let vocabulary = null;
  let wingVectors = [];
  let wingSignatures = [];
  let embeddingCache = loadEmbeddingCache(cachePath);
  let initialized = false;

  /**
   * Initialize the engine by computing Wing domain signatures.
   *
   * @param {Array} departments - From org-structure.json
   */
  async function calibrate(departments) {
    wingSignatures = departments.map((dept) => ({
      department: dept,
      signature: buildWingSignature(dept),
    }));

    const allTexts = wingSignatures.map((ws) => ws.signature);

    if (provider === 'tfidf') {
      vocabulary = buildVocabulary(allTexts);
      wingVectors = wingSignatures.map((ws) => ({
        department: ws.department,
        vector: tfidfVector(ws.signature, vocabulary),
      }));
    } else if (provider === 'openrouter' || provider === 'llm') {
      // Check cache first
      const uncached = [];
      const uncachedIndices = [];

      for (let i = 0; i < allTexts.length; i++) {
        const key = embeddingCacheKey(allTexts[i]);
        if (!embeddingCache.has(key)) {
          uncached.push(allTexts[i]);
          uncachedIndices.push(i);
        }
      }

      if (uncached.length > 0) {
        const newEmbeddings = await llmEmbed(uncached, { ...llmConfig, provider });
        for (let j = 0; j < uncached.length; j++) {
          embeddingCache.set(embeddingCacheKey(uncached[j]), newEmbeddings[j]);
        }
        saveEmbeddingCache(cachePath, embeddingCache);
      }

      wingVectors = wingSignatures.map((ws) => ({
        department: ws.department,
        vector: embeddingCache.get(embeddingCacheKey(ws.signature)),
      }));
    }

    initialized = true;
  }

  /**
   * Compute gravity for a Sortie and resolve routing.
   *
   * @param {{ title: string, body: string }} issue
   * @returns {Promise<object>} routing decision with gravity field
   */
  async function triage(issue) {
    if (!initialized) {
      throw new Error('Gravimetry engine not calibrated. Call calibrate() with departments first.');
    }

    const sortieSignature = buildSortieSignature(issue);

    let sortieVector;

    if (provider === 'tfidf') {
      sortieVector = tfidfVector(sortieSignature, vocabulary);
    } else if (provider === 'openrouter' || provider === 'llm') {
      const key = embeddingCacheKey(sortieSignature);
      if (embeddingCache.has(key)) {
        sortieVector = embeddingCache.get(key);
      } else {
        const [embedding] = await llmEmbed([sortieSignature], { ...llmConfig, provider });
        embeddingCache.set(key, embedding);
        saveEmbeddingCache(cachePath, embeddingCache);
        sortieVector = embedding;
      }
    }

    const gravityField = computeGravityField(sortieVector, wingVectors);
    const decision = resolveGravity(gravityField, thresholds);

    return {
      ...decision,
      sortieSignature,
      timestamp: new Date().toISOString(),
      provider,
    };
  }

  /**
   * Analyze a text fragment against Wing signatures without making a
   * routing decision. Used by Ghost Wing synthesis (Phase III) to detect
   * semantic gaps in the topology.
   *
   * @param {string} text
   * @returns {Promise<Array>} gravity field without resolution
   */
  async function probe(text) {
    if (!initialized) {
      throw new Error('Gravimetry engine not calibrated.');
    }

    let vector;
    if (provider === 'tfidf') {
      vector = tfidfVector(text, vocabulary);
    } else {
      const key = embeddingCacheKey(text);
      if (embeddingCache.has(key)) {
        vector = embeddingCache.get(key);
      } else {
        const [embedding] = await llmEmbed([text], { ...llmConfig, provider });
        embeddingCache.set(key, embedding);
        vector = embedding;
      }
    }

    return computeGravityField(vector, wingVectors);
  }

  return {
    calibrate,
    triage,
    probe,
    get isCalibrated() { return initialized; },
    get wingCount() { return wingVectors.length; },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Engine factory
  createGravimetryEngine,

  // Low-level utilities (for testing and Phase IV integration)
  tokenize,
  buildVocabulary,
  tfidfVector,
  cosineSimilarity,
  computeGravityField,
  resolveGravity,
  buildWingSignature,
  buildSortieSignature,
  embeddingCacheKey,

  // Embedding providers
  resolveEmbeddingProviderConfig,
  llmEmbed,
};
