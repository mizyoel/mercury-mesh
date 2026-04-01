#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_DIR_CANDIDATES = ['.mesh', '.mercury'];

function defaultRuntimeDir() {
  return RUNTIME_DIR_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || '.mesh';
}

function runtimeDirName(runtimeDir) {
  return path.basename(path.resolve(runtimeDir));
}

function parseArgs(argv) {
  const options = {
    meshDir: defaultRuntimeDir(),
    output: 'org-seed-results.json',
    apply: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mesh-dir') {
      options.meshDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage: node <runtime>/org/seed-runtime.js [--mesh-dir .mesh] --output org-seed-results.json [--apply] [--force]');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadTemplate(meshDir, fileName) {
  return fs.readFileSync(path.join(meshDir, 'templates', fileName), 'utf8');
}

function fillTemplate(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

function normalizeList(value, fallback) {
  if (Array.isArray(value) && value.length > 0) {
    return value.join(', ');
  }
  return fallback;
}

function seedFile(report, filePath, content, apply, force) {
  const exists = fs.existsSync(filePath);
  if (exists && !force) {
    report.skipped.push(path.relative(report.repoRoot, filePath));
    return;
  }

  report.created.push(path.relative(report.repoRoot, filePath));
  if (apply) {
    writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`);
  }
}

function collectContractOwners(departments) {
  const ownership = new Map();
  for (const department of departments) {
    const contracts = (((department || {}).runtime || {}).contracts) || [];
    for (const contractPath of contracts) {
      if (!ownership.has(contractPath)) ownership.set(contractPath, []);
      ownership.get(contractPath).push(department);
    }
  }
  return ownership;
}

function buildCharterContent(template, department) {
  const authority = department.authority || {};
  const runtime = department.runtime || {};
  return fillTemplate(template, {
    'Department Name': department.name || department.id,
    'What this department owns': normalizeList(department.domain, 'Define this department domain.'),
    'Agent name': department.lead || '{lead}',
    name: (department.members && department.members[0]) || '{name}',
    specialty: normalizeList(department.domain, '{specialty}'),
    notes: department.leadStyle || '{notes}',
    'list of decision types': normalizeList(authority.canDecideLocally, 'Define local decision scope.'),
    'list of triggers': normalizeList(authority.mustEscalate, 'Define escalation triggers.'),
    'department-id': department.id,
    'number of packets that may run concurrently': String(runtime.maxParallelism || 3),
    'list of `.mesh/org/contracts/*.md` files this department depends on': normalizeList(runtime.contracts, 'none'),
    minutes: String(runtime.claimLeaseMinutes || 30),
    'Department-specific conventions, coding standards, patterns': 'Document local conventions, packet ownership, and review expectations.',
  });
}

function buildBacklogContent(template, department) {
  return fillTemplate(template, {
    'Department Name': department.name || department.id,
    dept: department.id,
    'work packet title': `Bootstrap ${department.name || department.id} runtime`,
    notes: 'Seeded by org runtime initialization.',
  });
}

function buildStateContent(template, department) {
  return fillTemplate(template, {
    'department-id': department.id,
    AgentName: department.lead || 'unassigned',
  });
}

function buildContractContent(template, contractPath, owners) {
  const contractName = path.basename(contractPath, path.extname(contractPath));
  const producer = owners[0] ? owners[0].name || owners[0].id : '{producer}';
  const consumer = owners[1] ? owners[1].name || owners[1].id : '{consumer}';
  return fillTemplate(template, {
    'Contract Name': contractName,
    'What cross-department boundary this contract covers': `Interface between ${producer} and ${consumer}.`,
    'Department or agent that produces the output': producer,
    'Department or agent that consumes the output': consumer,
    'Input 1': 'Define required input.',
    'Output 1': 'Define produced artifact.',
    'Things that must remain stable while departments work in parallel': 'Versioned contract fields and handoff timing.',
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const meshDir = path.resolve(options.meshDir);
  const runtimeName = runtimeDirName(meshDir);
  const repoRoot = path.dirname(meshDir);
  const configPath = path.join(meshDir, 'config.json');
  const structurePath = path.join(meshDir, 'org', 'structure.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found: ${configPath}`);
  }

  const config = readJson(configPath);
  if (!config.orgMode) {
    const result = { enabled: false, reason: 'orgMode disabled' };
    writeFile(path.resolve(options.output), `${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (!fs.existsSync(structurePath)) {
    throw new Error(`structure.json not found: ${structurePath}`);
  }

  const structure = readJson(structurePath);
  const departments = Array.isArray(structure.departments) ? structure.departments : [];
  const contractOwners = collectContractOwners(departments);
  const charterTemplate = loadTemplate(meshDir, 'department-charter.md');
  const backlogTemplate = loadTemplate(meshDir, 'department-backlog.md');
  const stateTemplate = loadTemplate(meshDir, 'department-state.json');
  const contractTemplate = loadTemplate(meshDir, 'interface-contract.md');

  const report = {
    enabled: true,
    apply: options.apply,
    force: options.force,
    repoRoot,
    created: [],
    skipped: [],
    generatedAt: new Date().toISOString(),
  };

  const reconcileSource = path.join(meshDir, 'templates', 'org-runtime-reconcile.js');
  const seedSource = path.join(meshDir, 'templates', 'org-seed-runtime.js');
  const backlogBridgeSource = path.join(meshDir, 'templates', 'org-backlog-from-triage.js');
  const statusSource = path.join(meshDir, 'templates', 'org-status.js');
  const reconcileTarget = path.join(meshDir, 'org', 'reconcile.js');
  const seedTarget = path.join(meshDir, 'org', 'seed-runtime.js');
  const backlogBridgeTarget = path.join(meshDir, 'org', 'backlog-from-triage.js');
  const statusTarget = path.join(meshDir, 'org', 'status.js');

  seedFile(report, reconcileTarget, fs.readFileSync(reconcileSource, 'utf8'), options.apply, options.force);
  seedFile(report, seedTarget, fs.readFileSync(seedSource, 'utf8'), options.apply, options.force);
  seedFile(report, backlogBridgeTarget, fs.readFileSync(backlogBridgeSource, 'utf8'), options.apply, options.force);
  seedFile(report, statusTarget, fs.readFileSync(statusSource, 'utf8'), options.apply, options.force);

  for (const department of departments) {
    const runtime = department.runtime || {};
    const departmentRoot = path.join(meshDir, 'org', department.id);
    const charterPath = path.join(departmentRoot, 'charter.md');
    const backlogPath = path.resolve(repoRoot, runtime.backlogPath || `${runtimeName}/org/${department.id}/backlog.md`);
    const statePath = path.resolve(repoRoot, runtime.statePath || `${runtimeName}/org/${department.id}/state.json`);

    seedFile(report, charterPath, buildCharterContent(charterTemplate, department), options.apply, options.force);
    seedFile(report, backlogPath, buildBacklogContent(backlogTemplate, department), options.apply, options.force);
    seedFile(report, statePath, buildStateContent(stateTemplate, department), options.apply, options.force);
  }

  for (const [contractPath, owners] of contractOwners.entries()) {
    const absoluteContractPath = path.resolve(repoRoot, contractPath);
    seedFile(report, absoluteContractPath, buildContractContent(contractTemplate, contractPath, owners), options.apply, options.force);
  }

  writeFile(path.resolve(options.output), `${JSON.stringify(report, null, 2)}\n`);
}

main();