#!/usr/bin/env node
/**
 * Horizon Deck — Command Authorization Staging Area
 *
 * Phase V.6 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * The handoff point between machine capability and human will.
 * Stages autonomously generated proposals for Commander review.
 * Nothing launches without the Commander's word.
 *
 * Item types:
 *   - genesis-proposal  (from promoted experiments)
 *   - speculative-sortie (mesh-initiated mission drafts)
 *   - skill-draft       (synthesized skills awaiting approval)
 *
 * Decay: items auto-archive after configurable TTL (default 30 days).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// ─── Constants ──────────────────────────────────────────────────────────────

const QUEUE_FILE = 'queue.json';
const SCHEMA_VERSION = 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateItemId(title) {
  const hash = createHash('sha256').update(title + Date.now()).digest('hex').slice(0, 8);
  return `horizon-${hash}`;
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

// ─── Queue Management ───────────────────────────────────────────────────────

/**
 * Load the Horizon Deck queue.
 *
 * @param {string} meshDir
 * @returns {object}
 */
function loadQueue(meshDir) {
  const queuePath = path.join(meshDir, 'vanguard', 'horizon-deck', QUEUE_FILE);
  return readJsonSafe(queuePath) || {
    schemaVersion: SCHEMA_VERSION,
    maxStagedItems: 10,
    decayDays: 30,
    items: [],
  };
}

/**
 * Save the Horizon Deck queue.
 *
 * @param {string} meshDir
 * @param {object} queue
 */
function saveQueue(meshDir, queue) {
  const dir = path.join(meshDir, 'vanguard', 'horizon-deck');
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, QUEUE_FILE),
    JSON.stringify(queue, null, 2) + '\n',
    'utf8',
  );
}

// ─── Staging Operations ─────────────────────────────────────────────────────

/**
 * Stage an item on the Horizon Deck.
 *
 * @param {string} meshDir
 * @param {object} item
 * @param {string} item.type - "genesis-proposal" | "speculative-sortie" | "skill-draft"
 * @param {string} item.title
 * @param {string} [item.summary]
 * @param {string} [item.sourceExperiment]
 * @param {string} [item.proposalRef]
 * @param {string} [item.priority] - "low" | "normal" | "high"
 * @param {object} [options]
 * @param {number} [options.decayDays]
 * @param {number} [options.maxStagedItems]
 * @returns {{ success: boolean, item?: object, reason?: string }}
 */
function stageItem(meshDir, item, options = {}) {
  const queue = loadQueue(meshDir);
  const maxStaged = options.maxStagedItems || queue.maxStagedItems || 10;
  const decayDays = options.decayDays || queue.decayDays || 30;

  // Check capacity
  const pendingItems = queue.items.filter((i) => i.status === 'pending');
  if (pendingItems.length >= maxStaged) {
    return {
      success: false,
      reason: `Horizon Deck at capacity: ${pendingItems.length}/${maxStaged} items pending`,
    };
  }

  const now = new Date();
  const decaysAt = new Date(now.getTime() + decayDays * 24 * 60 * 60 * 1000);

  const horizonItem = {
    id: generateItemId(item.title || 'untitled'),
    type: item.type || 'genesis-proposal',
    title: item.title || 'Untitled Proposal',
    summary: item.summary || '',
    sourceExperiment: item.sourceExperiment || null,
    stagedAt: now.toISOString(),
    decaysAt: decaysAt.toISOString(),
    status: 'pending',
    proposalRef: item.proposalRef || null,
    priority: item.priority || 'normal',
    commanderNotes: null,
  };

  queue.items.push(horizonItem);
  saveQueue(meshDir, queue);

  // Also save detailed proposal data if present
  if (item.proposalData) {
    const proposalPath = path.join(
      meshDir, 'vanguard', 'horizon-deck', `${horizonItem.id}.json`,
    );
    fs.writeFileSync(
      proposalPath,
      JSON.stringify(item.proposalData, null, 2) + '\n',
      'utf8',
    );
  }

  return { success: true, item: horizonItem };
}

/**
 * Authorize a Horizon Deck item. Requires Commander action.
 *
 * @param {string} meshDir
 * @param {string} itemId
 * @param {string} [authorizedBy]
 * @param {string} [notes]
 * @returns {{ success: boolean, item?: object, reason?: string }}
 */
function authorizeItem(meshDir, itemId, authorizedBy, notes) {
  const queue = loadQueue(meshDir);
  const item = queue.items.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, reason: `Item "${itemId}" not found` };
  }
  if (item.status !== 'pending') {
    return { success: false, reason: `Item "${itemId}" is "${item.status}", expected "pending"` };
  }

  item.status = 'authorized';
  item.authorizedAt = new Date().toISOString();
  item.authorizedBy = authorizedBy || 'commander';
  if (notes) item.commanderNotes = notes;

  saveQueue(meshDir, queue);
  return { success: true, item };
}

/**
 * Reject a Horizon Deck item.
 *
 * @param {string} meshDir
 * @param {string} itemId
 * @param {string} [reason]
 * @returns {{ success: boolean, item?: object, reason?: string }}
 */
function rejectItem(meshDir, itemId, reason) {
  const queue = loadQueue(meshDir);
  const item = queue.items.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, reason: `Item "${itemId}" not found` };
  }
  if (item.status !== 'pending') {
    return { success: false, reason: `Item "${itemId}" is "${item.status}", expected "pending"` };
  }

  item.status = 'rejected';
  item.rejectedAt = new Date().toISOString();
  if (reason) item.commanderNotes = reason;

  saveQueue(meshDir, queue);
  return { success: true, item };
}

// ─── Decay Management ───────────────────────────────────────────────────────

/**
 * Check for and process decayed items.
 *
 * @param {string} meshDir
 * @param {object} [options]
 * @param {number} [options.warningDays=7]
 * @returns {{ decayed: Array, decayingSoon: Array }}
 */
function checkDecay(meshDir, options = {}) {
  const warningDays = options.warningDays || 7;
  const queue = loadQueue(meshDir);
  const now = Date.now();
  const decayed = [];
  const decayingSoon = [];
  let changed = false;

  for (const item of queue.items) {
    if (item.status !== 'pending') continue;
    if (!item.decaysAt) continue;

    const decayTime = new Date(item.decaysAt).getTime();
    const daysRemaining = (decayTime - now) / (1000 * 60 * 60 * 24);

    if (daysRemaining <= 0) {
      item.status = 'decayed';
      item.decayedAt = new Date().toISOString();
      decayed.push({ id: item.id, title: item.title });
      changed = true;
    } else if (daysRemaining <= warningDays) {
      decayingSoon.push({
        id: item.id,
        title: item.title,
        daysRemaining: Math.round(daysRemaining * 10) / 10,
      });
    }
  }

  if (changed) {
    saveQueue(meshDir, queue);
  }

  return { decayed, decayingSoon };
}

// ─── Query Operations ───────────────────────────────────────────────────────

/**
 * List all pending Horizon Deck items.
 *
 * @param {string} meshDir
 * @returns {Array}
 */
function listPending(meshDir) {
  const queue = loadQueue(meshDir);
  return queue.items.filter((i) => i.status === 'pending');
}

/**
 * Get summary statistics for the Horizon Deck.
 *
 * @param {string} meshDir
 * @returns {object}
 */
function stats(meshDir) {
  const queue = loadQueue(meshDir);
  const pending = queue.items.filter((i) => i.status === 'pending');
  const authorized = queue.items.filter((i) => i.status === 'authorized');
  const rejected = queue.items.filter((i) => i.status === 'rejected');
  const decayed = queue.items.filter((i) => i.status === 'decayed');
  const maxStaged = queue.maxStagedItems || 10;

  return {
    pending: pending.length,
    authorized: authorized.length,
    rejected: rejected.length,
    decayed: decayed.length,
    total: queue.items.length,
    capacity: maxStaged,
    available: Math.max(0, maxStaged - pending.length),
  };
}

/**
 * Load a specific Horizon Deck item with its full proposal data.
 *
 * @param {string} meshDir
 * @param {string} itemId
 * @returns {{ item: object|null, proposalData: object|null }}
 */
function inspectItem(meshDir, itemId) {
  const queue = loadQueue(meshDir);
  const item = queue.items.find((i) => i.id === itemId) || null;

  let proposalData = null;
  if (item) {
    const proposalPath = path.join(
      meshDir, 'vanguard', 'horizon-deck', `${itemId}.json`,
    );
    proposalData = readJsonSafe(proposalPath);
  }

  return { item, proposalData };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  stageItem,
  authorizeItem,
  rejectItem,
  checkDecay,
  listPending,
  stats,
  inspectItem,
  loadQueue,
  saveQueue,
};
