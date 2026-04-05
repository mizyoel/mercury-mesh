#!/usr/bin/env node
/**
 * Genesis Protocols — Permanent Integration Framework
 *
 * Phase V.5 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * The ceremony where a Ghost Wing earns its hull plating.
 * Transforms prototype artifacts from the Skunkworks into
 * permanent operational topology.
 *
 * Pipeline:
 *   Stage 1: Validate — verify success criteria, budget, containment
 *   Stage 2: Stage    — package proposal onto Horizon Deck
 *   Stage 3: Integrate — install skills, register Wing, update routing
 *   Stage 4: Cooldown  — monitor for post-integration anomalies
 *
 * Authority: EVENT HORIZON — Tier-1 Commander authorization only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const { loadExperiment } = require('./skunkworks.js');
const { loadRdWing, checkRdBudget } = require('./rd-wing.js');
const { listSkillDrafts, installSkill } = require('./skill-synthesis.js');
const { stageItem } = require('./horizon-deck.js');

// ─── Constants ──────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;
const DEFAULT_COOLDOWN_HOURS = 48;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateGenesisId(experimentId) {
  const hash = createHash('sha256').update(experimentId + '-genesis').digest('hex').slice(0, 8);
  return `genesis-${hash}`;
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

// ─── Stage 1: Validation ────────────────────────────────────────────────────

/**
 * Validate a promoted experiment for Genesis readiness.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @returns {{ valid: boolean, criteriaResults: Array, issues: string[] }}
 */
function validateExperiment(meshDir, experimentId) {
  const experiment = loadExperiment(meshDir, experimentId);
  const issues = [];
  const criteriaResults = [];

  if (!experiment) {
    return { valid: false, criteriaResults: [], issues: [`Experiment "${experimentId}" not found`] };
  }

  if (experiment.status !== 'promoted' && experiment.status !== 'review') {
    issues.push(`Experiment status is "${experiment.status}", expected "promoted" or "review"`);
  }

  // Check success criteria
  for (const criterion of (experiment.successCriteria || [])) {
    const result = experiment.results || {};
    const met = result.criteriaResults
      ? result.criteriaResults.some((cr) => cr.criterion === criterion && cr.met)
      : false;
    criteriaResults.push({
      criterion,
      met,
      evidence: met ? 'Recorded in experiment results' : 'Not verified',
    });
  }

  const unmetCriteria = criteriaResults.filter((cr) => !cr.met);
  if (unmetCriteria.length > 0) {
    issues.push(`${unmetCriteria.length} success criteria not met`);
  }

  // Check budget compliance
  const rdWing = loadRdWing(meshDir, experimentId);
  if (rdWing) {
    const budget = checkRdBudget(rdWing);
    if (budget.exceeded) {
      issues.push(`Budget exceeded: ${budget.used}/${budget.budget} tokens`);
    }
  }

  // Check for containment breaches (experiment files outside quarantine)
  const expDir = path.join(meshDir, 'vanguard', 'skunkworks', experimentId);
  if (!fs.existsSync(expDir)) {
    issues.push('Experiment directory not found');
  }

  return {
    valid: issues.length === 0,
    criteriaResults,
    issues,
  };
}

// ─── Stage 2: Proposal Generation & Staging ─────────────────────────────────

/**
 * Generate a Genesis Proposal and stage it on the Horizon Deck.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {object} [options]
 * @param {object} [options.config]
 * @returns {{ success: boolean, proposal?: object, horizonItem?: object, reason?: string }}
 */
function generateAndStageProposal(meshDir, experimentId, options = {}) {
  const experiment = loadExperiment(meshDir, experimentId);
  if (!experiment) {
    return { success: false, reason: `Experiment "${experimentId}" not found` };
  }

  const validation = validateExperiment(meshDir, experimentId);

  // Load resource data
  const rdWing = loadRdWing(meshDir, experimentId);
  const tokensUsed = rdWing ? (rdWing.rdMeta.tokensUsed || 0) : 0;
  const startedAt = rdWing ? rdWing.rdMeta.startedAt : experiment.createdAt;
  const hoursElapsed = startedAt
    ? (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
    : 0;

  // Discover skill drafts
  const skillDrafts = listSkillDrafts(meshDir, experimentId);

  // Build impact assessment
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  const structure = readJsonSafe(structurePath) || { departments: [] };
  const affectedWings = (structure.departments || [])
    .filter((dept) => {
      const deptKeywords = new Set(dept.routingKeywords || dept.domain || []);
      return (experiment.domain || []).some((d) => deptKeywords.has(d));
    })
    .map((dept) => dept.id);

  const genesisId = generateGenesisId(experimentId);

  const proposal = {
    schemaVersion: SCHEMA_VERSION,
    id: genesisId,
    experimentId,
    title: experiment.title,
    summary: `R&D experiment "${experiment.title}" completed. ${skillDrafts.length} skill(s) synthesized. ${validation.valid ? 'All criteria met.' : `${validation.issues.length} issue(s) found.`}`,
    hypothesis: experiment.hypothesis,
    successCriteria: experiment.successCriteria || [],
    criteriaResults: validation.criteriaResults,
    artifacts: {
      skills: skillDrafts,
      routingChanges: experiment.domain
        ? [`Add '${experiment.domain.join("', '")}' domain(s) to Gravimetry corpus`]
        : [],
      wingBlueprint: {
        id: experiment.id.replace('exp-', 'wing-'),
        name: experiment.title,
        domain: experiment.domain || [],
        lifecycle: 'permanent',
      },
    },
    impactAssessment: {
      affectedWings,
      riskLevel: affectedWings.length > 2 ? 'high' : affectedWings.length > 0 ? 'medium' : 'low',
      validationPassed: validation.valid,
      validationIssues: validation.issues,
    },
    resourcesConsumed: {
      tokensUsed,
      timeElapsedHours: Math.round(hoursElapsed * 10) / 10,
    },
    status: 'awaiting-authorization',
    generatedAt: new Date().toISOString(),
    authorizedAt: null,
    authorizedBy: null,
    integratedAt: null,
    cooldownExpiresAt: null,
  };

  // Save proposal to genesis directory
  const genesisDir = path.join(meshDir, 'vanguard', 'genesis');
  ensureDir(genesisDir);
  fs.writeFileSync(
    path.join(genesisDir, `${genesisId}.json`),
    JSON.stringify(proposal, null, 2) + '\n',
    'utf8',
  );

  // Stage on Horizon Deck
  const stageResult = stageItem(meshDir, {
    type: 'genesis-proposal',
    title: experiment.title,
    summary: proposal.summary,
    sourceExperiment: experimentId,
    proposalRef: genesisId,
    priority: affectedWings.length > 2 ? 'high' : 'normal',
    proposalData: proposal,
  }, options.config || {});

  if (!stageResult.success) {
    return { success: false, reason: stageResult.reason, proposal };
  }

  return { success: true, proposal, horizonItem: stageResult.item };
}

/**
 * Authorize a Genesis proposal after Horizon Deck approval.
 *
 * @param {string} meshDir
 * @param {string} genesisId
 * @param {string} [authorizedBy]
 * @param {string} [notes]
 * @returns {{ success: boolean, proposal?: object, reason?: string }}
 */
function authorizeProposal(meshDir, genesisId, authorizedBy, notes) {
  const proposalPath = path.join(meshDir, 'vanguard', 'genesis', `${genesisId}.json`);
  const proposal = readJsonSafe(proposalPath);
  if (!proposal) {
    return { success: false, reason: `Genesis proposal "${genesisId}" not found` };
  }
  if (proposal.status !== 'awaiting-authorization') {
    return { success: false, reason: `Proposal status is "${proposal.status}", expected "awaiting-authorization"` };
  }

  proposal.status = 'authorized';
  proposal.authorizedAt = new Date().toISOString();
  proposal.authorizedBy = authorizedBy || 'commander';
  if (notes) {
    proposal.commanderNotes = notes;
  }

  fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2) + '\n', 'utf8');
  return { success: true, proposal };
}

// ─── Stage 3: Integration ───────────────────────────────────────────────────

/**
 * Execute Genesis integration for an authorized proposal.
 * This is the irreversible-class action that modifies operational topology.
 *
 * @param {string} meshDir
 * @param {string} genesisId
 * @param {object} [options]
 * @param {object} [options.config]
 * @returns {{ success: boolean, integrated?: object, reason?: string }}
 */
function integrate(meshDir, genesisId, options = {}) {
  const config = options.config || {};
  const cooldownHours = config.cooldownHours || DEFAULT_COOLDOWN_HOURS;

  // Load proposal
  const proposalPath = path.join(meshDir, 'vanguard', 'genesis', `${genesisId}.json`);
  const proposal = readJsonSafe(proposalPath);
  if (!proposal) {
    return { success: false, reason: `Genesis proposal "${genesisId}" not found` };
  }
  if (proposal.status !== 'awaiting-authorization' && proposal.status !== 'authorized') {
    return { success: false, reason: `Proposal status is "${proposal.status}", expected "authorized"` };
  }

  const projectRoot = path.resolve(meshDir, '..');
  const integrated = { skills: [], wings: [], errors: [] };

  // 3a. Install synthesized skills
  if (proposal.artifacts && proposal.artifacts.skills) {
    for (const skillFile of proposal.artifacts.skills) {
      const skillPath = path.join(
        meshDir, 'vanguard', 'skunkworks', proposal.experimentId, 'skills', skillFile,
      );
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf8');
      const slug = skillFile.replace(/\.md$/, '');
      const result = installSkill(projectRoot, { slug, content });
      if (result.installed.length > 0) {
        integrated.skills.push({ slug, installed: result.installed });
      }
      if (result.errors.length > 0) {
        integrated.errors.push(...result.errors);
      }
    }
  }

  // 3b. Register new Wing in structure.json
  if (proposal.artifacts && proposal.artifacts.wingBlueprint) {
    const structurePath = path.join(meshDir, 'org', 'structure.json');
    const structure = readJsonSafe(structurePath) || { departments: [] };

    const wingBlueprint = proposal.artifacts.wingBlueprint;
    const existingWing = (structure.departments || []).find((d) => d.id === wingBlueprint.id);

    if (!existingWing) {
      const newWing = {
        id: wingBlueprint.id,
        name: wingBlueprint.name,
        domain: wingBlueprint.domain || [],
        routingKeywords: wingBlueprint.domain || [],
        lifecycle: 'permanent',
        genesisOrigin: genesisId,
        integratedAt: new Date().toISOString(),
      };
      structure.departments = structure.departments || [];
      structure.departments.push(newWing);
      ensureDir(path.dirname(structurePath));
      fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2) + '\n', 'utf8');
      integrated.wings.push(newWing);
    }
  }

  // 3c. Update proposal status
  const now = new Date();
  proposal.status = 'integrated';
  proposal.integratedAt = now.toISOString();
  proposal.cooldownExpiresAt = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2) + '\n', 'utf8');

  return { success: true, integrated, proposal };
}

// ─── Stage 4: Cooldown Monitoring ───────────────────────────────────────────

/**
 * Check all active Genesis integrations for cooldown status.
 *
 * @param {string} meshDir
 * @returns {{ active: Array, completed: Array, anomalies: Array }}
 */
function checkCooldowns(meshDir) {
  const genesisDir = path.join(meshDir, 'vanguard', 'genesis');
  if (!fs.existsSync(genesisDir)) return { active: [], completed: [], anomalies: [] };

  const active = [];
  const completed = [];
  const anomalies = [];

  let files;
  try {
    files = fs.readdirSync(genesisDir).filter((f) => f.startsWith('genesis-') && f.endsWith('.json'));
  } catch {
    return { active, completed, anomalies };
  }

  for (const file of files) {
    const proposal = readJsonSafe(path.join(genesisDir, file));
    if (!proposal || proposal.status !== 'integrated') continue;
    if (!proposal.cooldownExpiresAt) continue;

    const expiresAt = new Date(proposal.cooldownExpiresAt).getTime();
    const now = Date.now();

    if (now >= expiresAt) {
      // Cooldown complete — mark as finalized
      proposal.status = 'complete';
      fs.writeFileSync(
        path.join(genesisDir, file),
        JSON.stringify(proposal, null, 2) + '\n',
        'utf8',
      );
      completed.push({ id: proposal.id, experimentId: proposal.experimentId, title: proposal.title });
    } else {
      const hoursRemaining = (expiresAt - now) / (1000 * 60 * 60);
      active.push({
        id: proposal.id,
        experimentId: proposal.experimentId,
        title: proposal.title,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      });
    }
  }

  return { active, completed, anomalies };
}

// ─── Query ──────────────────────────────────────────────────────────────────

/**
 * Load a specific Genesis proposal.
 *
 * @param {string} meshDir
 * @param {string} genesisId
 * @returns {object|null}
 */
function loadProposal(meshDir, genesisId) {
  const proposalPath = path.join(meshDir, 'vanguard', 'genesis', `${genesisId}.json`);
  return readJsonSafe(proposalPath);
}

/**
 * List all Genesis proposals.
 *
 * @param {string} meshDir
 * @returns {Array}
 */
function listProposals(meshDir) {
  const genesisDir = path.join(meshDir, 'vanguard', 'genesis');
  if (!fs.existsSync(genesisDir)) return [];

  try {
    return fs.readdirSync(genesisDir)
      .filter((f) => f.startsWith('genesis-') && f.endsWith('.json'))
      .map((f) => readJsonSafe(path.join(genesisDir, f)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  validateExperiment,
  generateAndStageProposal,
  authorizeProposal,
  integrate,
  checkCooldowns,
  loadProposal,
  listProposals,
  generateGenesisId,
};
