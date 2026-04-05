#!/usr/bin/env node
/**
 * Skill Synthesis — Autonomous Capability Generation
 *
 * Phase V.3 of the Mercury Mesh Nervous System (The Vanguard)
 *
 * Autonomously generates new .skill files, teaching the system
 * how to handle novel domains it previously could not navigate.
 *
 * Skills start at "low" confidence and climb via the Confidence Ladder:
 *   low → medium → high
 *
 * Depends on:
 *   - .mesh/templates/skill.md for scaffold template
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ─── Confidence Ladder ──────────────────────────────────────────────────────

const CONFIDENCE_LEVELS = {
  low: { weight: 0.5, promotionThreshold: 3 },
  medium: { weight: 1.0, promotionThreshold: 10 },
  high: { weight: 1.2, promotionThreshold: Infinity },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unknown-skill';
}

// ─── Skill Draft Generation ─────────────────────────────────────────────────

/**
 * Synthesize a skill draft from experiment context.
 *
 * @param {object} options
 * @param {string} options.name - Skill name
 * @param {string} options.description - What the skill teaches
 * @param {string} options.domain - Domain (e.g., "graphql, api-design")
 * @param {string} options.experimentId - Source experiment
 * @param {string} options.outriderCandidate - Source adjacency candidate ID
 * @param {string} options.rdWingId - Source R&D Wing
 * @param {string[]} [options.patterns] - Observed patterns
 * @param {string[]} [options.antiPatterns] - Known anti-patterns
 * @param {string} [options.context] - When/why this skill applies
 * @param {string[]} [options.examples] - Code examples or references
 * @returns {object} { slug, content, metadata }
 */
function synthesizeSkill(options) {
  const {
    name,
    description = '',
    domain = '',
    experimentId,
    outriderCandidate,
    rdWingId,
    patterns = [],
    antiPatterns = [],
    context = '',
    examples = [],
  } = options;

  const slug = slugify(name);
  const now = new Date().toISOString();

  const frontmatter = [
    '---',
    `name: "${slug}"`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `domain: "${domain}"`,
    'confidence: "low"',
    'source: "synthesized"',
    'synthesisProvenance:',
    `  experimentId: "${experimentId || ''}"`,
    `  outriderCandidate: "${outriderCandidate || ''}"`,
    `  rdWingId: "${rdWingId || ''}"`,
    `  synthesizedAt: "${now}"`,
    '  selfTestResult: "pending"',
    '  constellationEntryId: ""',
    'tools: []',
    '---',
  ].join('\n');

  const body = [
    '',
    '## Context',
    context || `{When and why this skill applies — synthesized from Vanguard experiment ${experimentId}}`,
    '',
    '## Patterns',
    patterns.length > 0
      ? patterns.map((p) => `- ${p}`).join('\n')
      : '{Specific patterns, conventions, or approaches}',
    '',
    '## Examples',
    examples.length > 0
      ? examples.map((e) => `- ${e}`).join('\n')
      : '{Code examples or references}',
    '',
    '## Anti-Patterns',
    antiPatterns.length > 0
      ? antiPatterns.map((a) => `- ${a}`).join('\n')
      : '{What to avoid}',
    '',
  ].join('\n');

  return {
    slug,
    content: frontmatter + body,
    metadata: {
      name: slug,
      description,
      domain,
      confidence: 'low',
      source: 'synthesized',
      experimentId,
      outriderCandidate,
      rdWingId,
      synthesizedAt: now,
    },
  };
}

// ─── Skill File Management ──────────────────────────────────────────────────

/**
 * Write a synthesized skill draft to the Skunkworks experiment directory.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @param {object} skillDraft - From synthesizeSkill()
 * @param {boolean} [apply=false]
 * @returns {{ success: boolean, path: string }}
 */
function writeSkillDraft(meshDir, experimentId, skillDraft, apply = false) {
  const skillDir = path.join(
    meshDir, 'vanguard', 'skunkworks', experimentId, 'skills',
  );
  const skillPath = path.join(skillDir, `${skillDraft.slug}.md`);

  if (apply) {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, skillDraft.content, 'utf8');
  }

  return { success: true, path: skillPath };
}

/**
 * Install a synthesized skill into the live skill directories.
 * Writes to both .copilot/skills/ and .mesh/templates/skills/ if they exist.
 * Used by Genesis Protocols during integration.
 *
 * @param {string} projectRoot - Project root (parent of .mesh/)
 * @param {object} skillDraft - From synthesizeSkill()
 * @returns {{ installed: string[], errors: string[] }}
 */
function installSkill(projectRoot, skillDraft) {
  const installed = [];
  const errors = [];

  const targets = [
    path.join(projectRoot, '.copilot', 'skills', skillDraft.slug, 'SKILL.md'),
  ];

  // Mirror to templates if directory exists
  const templateBase = path.join(projectRoot, '.mesh', 'templates', 'skills');
  if (fs.existsSync(templateBase)) {
    targets.push(path.join(templateBase, skillDraft.slug, 'SKILL.md'));
  }

  for (const target of targets) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, skillDraft.content, 'utf8');
      installed.push(target);
    } catch (err) {
      errors.push(`${target}: ${err.message}`);
    }
  }

  return { installed, errors };
}

/**
 * List all synthesized skill drafts in an experiment.
 *
 * @param {string} meshDir
 * @param {string} experimentId
 * @returns {string[]} skill file names
 */
function listSkillDrafts(meshDir, experimentId) {
  const skillDir = path.join(
    meshDir, 'vanguard', 'skunkworks', experimentId, 'skills',
  );
  if (!fs.existsSync(skillDir)) return [];

  try {
    return fs.readdirSync(skillDir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

/**
 * Update a skill's self-test result in its frontmatter.
 *
 * @param {string} skillPath
 * @param {string} result - "pass" | "fail"
 */
function updateSelfTestResult(skillPath, result) {
  if (!fs.existsSync(skillPath)) return;
  let content = fs.readFileSync(skillPath, 'utf8');
  content = content.replace(
    /selfTestResult: "pending"/,
    `selfTestResult: "${result}"`,
  );
  fs.writeFileSync(skillPath, content, 'utf8');
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  synthesizeSkill,
  writeSkillDraft,
  installSkill,
  listSkillDrafts,
  updateSelfTestResult,
  slugify,
  CONFIDENCE_LEVELS,
};
