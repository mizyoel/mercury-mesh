#!/usr/bin/env node
/**
 * Ghost Wing Synthesis — Phase III of the Mercury Mesh Nervous System
 *
 * When a Sortie possesses a gravitational signature that matches
 * no existing Wing, the mesh no longer throws an unassigned exception.
 * It synthesizes a temporary Ghost Wing — a transient department with
 * a localized charter, auto-generated backlog, and provisional agents.
 *
 * Ghost Wing Lifecycle:
 *   void-detection → synthesis → probation → [solidify | dissolve]
 *
 * Ghost Wings that succeed are solidified into permanent topology.
 * Ghost Wings that fail are dissolved, compute reclaimed, and the
 * failure is recorded in the Black Box for Constellation Memory.
 *
 * Depends on:
 *   - semantic-gravimetry.js (Phase I) for void detection
 *   - autonomic-core.js (Phase II) for lifecycle monitoring
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// ─── Ghost Wing ID Generation ───────────────────────────────────────────────

function generateGhostId(sortieSignature) {
  const hash = createHash('sha256').update(sortieSignature).digest('hex').slice(0, 8);
  return `ghost-${hash}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'unknown';
}

// ─── Domain Inference ───────────────────────────────────────────────────────

/**
 * Extract domain keywords from a Sortie's text. Used to seed
 * the Ghost Wing's routing keywords and domain definition.
 *
 * This is a heuristic extraction — the real power comes from
 * the semantic gravimetry engine classifying the Sortie.
 */
function inferDomainKeywords(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Frequency count
  const freq = new Map();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  // Sort by frequency and take top domain-like terms
  const NOISE = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was',
    'has', 'have', 'been', 'will', 'should', 'could', 'would', 'not',
    'but', 'they', 'their', 'our', 'also', 'into', 'when', 'than',
    'then', 'each', 'other', 'some', 'more', 'need', 'must', 'can',
  ]);

  return [...freq.entries()]
    .filter(([token]) => !NOISE.has(token))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([token]) => token);
}

/**
 * Synthesize a Wing name from domain keywords.
 */
function synthesizeWingName(keywords) {
  if (keywords.length === 0) return 'Void Wing';

  // Take the top 2 keywords and title-case them
  const top = keywords.slice(0, 2).map(
    (k) => k.charAt(0).toUpperCase() + k.slice(1),
  );

  return `${top.join(' ')} Wing`;
}

// ─── Ghost Wing Blueprint ───────────────────────────────────────────────────

/**
 * Create a Ghost Wing blueprint from a Sortie that fell into the Void.
 *
 * @param {object} sortie - { title, body } of the unroutable work
 * @param {object} gravityField - From semantic-gravimetry probe()
 * @param {object} [existingDepartments] - Current org-structure departments
 * @returns {object} Ghost Wing blueprint
 */
function synthesizeBlueprint(sortie, gravityField, existingDepartments = []) {
  const signature = `${sortie.title || ''}\n${sortie.body || ''}`.trim();
  const ghostId = generateGhostId(signature);
  const keywords = inferDomainKeywords(signature);
  const wingName = synthesizeWingName(keywords);

  // Identify which existing Wings had partial gravity (potential Airbridge partners)
  const partialAttractors = gravityField
    .filter((entry) => entry.similarity > 0.05)
    .map((entry) => ({
      wingId: entry.department.id,
      wingName: entry.department.name || entry.department.id,
      similarity: entry.similarity,
    }));

  return {
    id: ghostId,
    name: wingName,
    lifecycle: 'ghost',
    synthesizedAt: new Date().toISOString(),
    synthesizedFrom: {
      sortieTitle: sortie.title || '',
      sortieSignature: signature.slice(0, 500),
    },
    domain: keywords.slice(0, 5),
    routingKeywords: keywords,
    lead: '{uncast}',
    members: [],
    leadStyle: 'player-coach',
    authority: {
      canDecideLocally: [
        'local implementation details',
        'test strategy within Ghost Wing scope',
      ],
      mustEscalate: [
        'cross-department API changes',
        'solidification into permanent topology',
        'roster changes',
      ],
    },
    runtime: {
      autonomyMode: 'delegated',
      maxParallelism: 2,
      claimLeaseMinutes: 20,
      heartbeatMinutes: 10,
      backlogPath: `.mesh/org/${ghostId}/backlog.md`,
      statePath: `.mesh/org/${ghostId}/state.json`,
      contracts: [],
    },
    ghostMeta: {
      partialAttractors,
      solidificationThreshold: 3, // Successful tasks before solidification
      dissolutionThreshold: 2,    // Failed tasks before dissolution
      successCount: 0,
      failureCount: 0,
      maxLifespanHours: 72,
    },
  };
}

// ─── Ghost Wing Materialization ─────────────────────────────────────────────

/**
 * Materialize a Ghost Wing into the filesystem.
 * Creates the department folder, charter, backlog, and state files.
 *
 * @param {string} meshDir
 * @param {object} blueprint - Ghost Wing blueprint
 * @param {boolean} [apply=false]
 * @returns {object} materialization report
 */
function materialize(meshDir, blueprint, apply = false) {
  const orgDir = path.join(meshDir, 'org', blueprint.id);
  const report = {
    ghostId: blueprint.id,
    created: [],
    errors: [],
  };

  const files = {
    charter: {
      path: path.join(orgDir, 'charter.md'),
      content: generateCharter(blueprint),
    },
    backlog: {
      path: path.join(orgDir, 'backlog.md'),
      content: generateBacklog(blueprint),
    },
    state: {
      path: path.join(orgDir, 'state.json'),
      content: JSON.stringify(generateState(blueprint), null, 2) + '\n',
    },
    meta: {
      path: path.join(orgDir, 'ghost-meta.json'),
      content: JSON.stringify(blueprint.ghostMeta, null, 2) + '\n',
    },
  };

  for (const [name, file] of Object.entries(files)) {
    try {
      if (apply) {
        fs.mkdirSync(path.dirname(file.path), { recursive: true });
        fs.writeFileSync(file.path, file.content, 'utf8');
      }
      report.created.push(file.path);
    } catch (err) {
      report.errors.push({ file: name, error: err.message });
    }
  }

  // Register in org-structure.json
  if (apply) {
    try {
      registerInStructure(meshDir, blueprint);
    } catch (err) {
      report.errors.push({ file: 'structure.json', error: err.message });
    }
  }

  return report;
}

function generateCharter(blueprint) {
  return [
    `# ${blueprint.name} — Ghost Wing Charter`,
    '',
    `> **Lifecycle:** GHOST — provisional topology, pending solidification or dissolution.`,
    `> **Synthesized:** ${blueprint.synthesizedAt}`,
    `> **Origin:** "${blueprint.synthesizedFrom.sortieTitle}"`,
    '',
    '## Domain',
    '',
    blueprint.domain.map((d) => `- ${d}`).join('\n'),
    '',
    '## Authority',
    '',
    '### Can Decide Locally',
    blueprint.authority.canDecideLocally.map((d) => `- ${d}`).join('\n'),
    '',
    '### Must Escalate',
    blueprint.authority.mustEscalate.map((d) => `- ${d}`).join('\n'),
    '',
    '## Runtime Parameters',
    '',
    `- **Max Parallelism:** ${blueprint.runtime.maxParallelism}`,
    `- **Claim Lease:** ${blueprint.runtime.claimLeaseMinutes} minutes`,
    `- **Heartbeat:** ${blueprint.runtime.heartbeatMinutes} minutes`,
    '',
    '## Ghost Wing Lifecycle',
    '',
    `- **Solidification Threshold:** ${blueprint.ghostMeta.solidificationThreshold} successful tasks`,
    `- **Dissolution Threshold:** ${blueprint.ghostMeta.dissolutionThreshold} failed tasks`,
    `- **Max Lifespan:** ${blueprint.ghostMeta.maxLifespanHours} hours`,
    '',
    '## Partial Gravity Attractors',
    '',
    blueprint.ghostMeta.partialAttractors.length > 0
      ? blueprint.ghostMeta.partialAttractors.map(
          (a) => `- **${a.wingName}** (similarity: ${a.similarity.toFixed(3)})`,
        ).join('\n')
      : '- None — this Wing emerged from the Void.',
    '',
  ].join('\n');
}

function generateBacklog(blueprint) {
  return [
    `# ${blueprint.name} — Backlog`,
    '',
    `| ID | Title | Status | Owner | Notes |`,
    `| --- | --- | --- | --- | --- |`,
    `| ${blueprint.id}-001 | ${blueprint.synthesizedFrom.sortieTitle || 'Initial sortie'} | queued | - | Synthesized by Ghost Wing system |`,
    '',
  ].join('\n');
}

function generateState(blueprint) {
  return {
    departmentId: blueprint.id,
    lifecycle: 'ghost',
    activeLead: blueprint.lead,
    claims: [],
    lastHeartbeat: new Date().toISOString(),
    ghostMeta: blueprint.ghostMeta,
  };
}

/**
 * Register a Ghost Wing in the org-structure.json file.
 */
function registerInStructure(meshDir, blueprint) {
  const structurePath = path.join(meshDir, 'org', 'structure.json');

  let structure = { departments: [], crossDepartment: { strategy: 'contract-first', escalation: 'lead-alignment' } };
  if (fs.existsSync(structurePath)) {
    structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  }

  // Don't duplicate
  if (structure.departments.some((d) => d.id === blueprint.id)) {
    return;
  }

  // eslint-disable-next-line no-unused-vars
  const { ghostMeta, synthesizedAt, synthesizedFrom, lifecycle, ...departmentEntry } = blueprint;
  departmentEntry._ghost = true;
  departmentEntry._synthesizedAt = synthesizedAt;

  structure.departments.push(departmentEntry);

  fs.mkdirSync(path.dirname(structurePath), { recursive: true });
  fs.writeFileSync(structurePath, `${JSON.stringify(structure, null, 2)}\n`, 'utf8');
}

// ─── Solidification & Dissolution ───────────────────────────────────────────

/**
 * Solidify a Ghost Wing into permanent topology.
 * Removes ghost metadata and promotes the department.
 *
 * @param {string} meshDir
 * @param {string} ghostId
 * @returns {object} solidification report
 */
function solidify(meshDir, ghostId) {
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  if (!fs.existsSync(structurePath)) {
    return { success: false, reason: 'structure.json not found' };
  }

  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const dept = structure.departments.find((d) => d.id === ghostId);

  if (!dept) {
    return { success: false, reason: `Department "${ghostId}" not found in structure` };
  }

  if (!dept._ghost) {
    return { success: false, reason: `Department "${ghostId}" is not a Ghost Wing` };
  }

  // Promote: remove ghost markers
  delete dept._ghost;
  delete dept._synthesizedAt;

  fs.writeFileSync(structurePath, `${JSON.stringify(structure, null, 2)}\n`, 'utf8');

  // Update the charter
  const charterPath = path.join(meshDir, 'org', ghostId, 'charter.md');
  if (fs.existsSync(charterPath)) {
    let charter = fs.readFileSync(charterPath, 'utf8');
    charter = charter.replace(
      /> \*\*Lifecycle:\*\* GHOST[^\n]*/,
      '> **Lifecycle:** SOLIDIFIED — permanent topology.',
    );
    fs.writeFileSync(charterPath, charter, 'utf8');
  }

  // Update the state
  const statePath = path.join(meshDir, 'org', ghostId, 'state.json');
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.lifecycle = 'active';
    delete state.ghostMeta;
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  // Record decision
  recordGhostDecision(meshDir, ghostId, 'solidified', `Ghost Wing "${ghostId}" solidified into permanent topology after reaching success threshold.`);

  return { success: true, ghostId, lifecycle: 'solidified' };
}

/**
 * Dissolve a Ghost Wing — remove from topology, archive remnants.
 *
 * @param {string} meshDir
 * @param {string} ghostId
 * @returns {object} dissolution report
 */
function dissolve(meshDir, ghostId) {
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  if (!fs.existsSync(structurePath)) {
    return { success: false, reason: 'structure.json not found' };
  }

  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const deptIndex = structure.departments.findIndex((d) => d.id === ghostId);

  if (deptIndex === -1) {
    return { success: false, reason: `Department "${ghostId}" not found in structure` };
  }

  const dept = structure.departments[deptIndex];
  if (!dept._ghost) {
    return { success: false, reason: `Department "${ghostId}" is not a Ghost Wing — refusing to dissolve permanent topology` };
  }

  // Remove from structure
  structure.departments.splice(deptIndex, 1);
  fs.writeFileSync(structurePath, `${JSON.stringify(structure, null, 2)}\n`, 'utf8');

  // Archive — move state to dissolved/ rather than deleting
  const ghostDir = path.join(meshDir, 'org', ghostId);
  const archiveDir = path.join(meshDir, 'org', '_dissolved', ghostId);

  if (fs.existsSync(ghostDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    const files = fs.readdirSync(ghostDir);
    for (const file of files) {
      fs.copyFileSync(path.join(ghostDir, file), path.join(archiveDir, file));
    }
    // Remove ghosts dir after archive
    for (const file of files) {
      fs.unlinkSync(path.join(ghostDir, file));
    }
    fs.rmdirSync(ghostDir);
  }

  recordGhostDecision(meshDir, ghostId, 'dissolved', `Ghost Wing "${ghostId}" dissolved after reaching failure threshold. Archived to _dissolved/.`);

  return { success: true, ghostId, lifecycle: 'dissolved', archiveDir };
}

/**
 * Evaluate a Ghost Wing's lifecycle — called by the Autonomic Core.
 * Checks success/failure counts and lifespan to determine next action.
 *
 * @param {string} meshDir
 * @param {string} ghostId
 * @returns {{ action: string, reason: string }}
 */
function evaluateLifecycle(meshDir, ghostId) {
  const metaPath = path.join(meshDir, 'org', ghostId, 'ghost-meta.json');
  if (!fs.existsSync(metaPath)) {
    return { action: 'none', reason: 'ghost-meta.json not found' };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  // Check solidification
  if (meta.successCount >= meta.solidificationThreshold) {
    return {
      action: 'solidify',
      reason: `Success count (${meta.successCount}) reached solidification threshold (${meta.solidificationThreshold}).`,
    };
  }

  // Check dissolution
  if (meta.failureCount >= meta.dissolutionThreshold) {
    return {
      action: 'dissolve',
      reason: `Failure count (${meta.failureCount}) reached dissolution threshold (${meta.dissolutionThreshold}).`,
    };
  }

  // Check lifespan
  const statePath = path.join(meshDir, 'org', ghostId, 'state.json');
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state.ghostMeta) {
      // Find synthesized time from the structure
      const structurePath = path.join(meshDir, 'org', 'structure.json');
      if (fs.existsSync(structurePath)) {
        const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
        const dept = structure.departments.find((d) => d.id === ghostId);
        if (dept && dept._synthesizedAt) {
          const age = (Date.now() - new Date(dept._synthesizedAt).getTime()) / (3600_000);
          if (age > meta.maxLifespanHours) {
            return {
              action: 'dissolve',
              reason: `Ghost Wing lifespan (${age.toFixed(1)}h) exceeded max (${meta.maxLifespanHours}h).`,
            };
          }
        }
      }
    }
  }

  return { action: 'none', reason: 'Ghost Wing within lifecycle parameters.' };
}

/**
 * Record a Ghost Wing lifecycle decision in the Black Box.
 */
function recordGhostDecision(meshDir, ghostId, action, description) {
  const inboxDir = path.join(meshDir, 'decisions', 'inbox');
  fs.mkdirSync(inboxDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const slug = timestamp.replace(/[:.]/g, '-');
  const fileName = `ghost-${ghostId}-${action}-${slug}.md`;

  const entry = [
    `### ${timestamp}: Ghost Wing ${action} — ${ghostId}`,
    '**By:** Ghost Wing Synthesis (Nervous System Phase III)',
    `**Scope:** dept:${ghostId}`,
    `**What:** ${description}`,
    `**Why:** Autonomous topology mutation based on mission gravimetry and lifecycle evaluation.`,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(inboxDir, fileName), entry, 'utf8');
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Blueprint
  synthesizeBlueprint,
  generateGhostId,
  inferDomainKeywords,
  synthesizeWingName,

  // Lifecycle
  materialize,
  solidify,
  dissolve,
  evaluateLifecycle,

  // Structure
  registerInStructure,
};
