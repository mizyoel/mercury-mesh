#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_DIR_CANDIDATES = ['.mesh', '.mercury', '.squad'];

function defaultRuntimeDir() {
  return RUNTIME_DIR_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || '.squad';
}

function runtimeDirName(runtimeDir) {
  return path.basename(path.resolve(runtimeDir));
}

function parseArgs(argv) {
  const options = {
    squadDir: defaultRuntimeDir(),
    output: 'org-status.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--squad-dir' || arg === '--mesh-dir') {
      options.squadDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = argv[index + 1];
      index += 1;
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
  console.log('Usage: node <runtime>/org/status.js [--mesh-dir .mesh | --squad-dir .squad] --output org-status.json');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseMarkdownTable(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    rows.push(cells);
  }

  if (rows.length < 2) return null;
  return { headers: rows[0], rows: rows.slice(1) };
}

function summarizeBacklog(backlogPath) {
  if (!fs.existsSync(backlogPath)) {
    return { exists: false, counts: {}, blocked: [] };
  }

  const table = parseMarkdownTable(fs.readFileSync(backlogPath, 'utf8'));
  if (!table) {
    return { exists: true, counts: {}, blocked: [], warning: 'Backlog table not found' };
  }

  const headerIndex = new Map(table.headers.map((header, index) => [header.toLowerCase(), index]));
  const idIndex = headerIndex.get('id');
  const statusIndex = headerIndex.get('status');
  const notesIndex = headerIndex.get('notes');
  const counts = {};
  const blocked = [];

  for (const row of table.rows) {
    const status = statusIndex >= 0 ? row[statusIndex] : 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    if (status === 'blocked') {
      blocked.push({
        id: idIndex >= 0 ? row[idIndex] : 'unknown',
        notes: notesIndex >= 0 ? row[notesIndex] : '',
      });
    }
  }

  return { exists: true, counts, blocked };
}

function summarizeState(statePath, heartbeatMinutes) {
  if (!fs.existsSync(statePath)) {
    return { exists: false, activeClaims: 0, staleHeartbeat: false, parallelismBreach: false };
  }

  const state = readJson(statePath);
  const activeClaims = Array.isArray(state.activeClaims) ? state.activeClaims : [];
  const heartbeat = state.lastHeartbeatAt ? new Date(state.lastHeartbeatAt) : null;
  const staleHeartbeat = !heartbeat || Number.isNaN(heartbeat.valueOf())
    ? true
    : (Date.now() - heartbeat.valueOf()) > heartbeatMinutes * 60 * 1000;

  return {
    exists: true,
    activeClaims: activeClaims.length,
    staleHeartbeat,
    lastHeartbeatAt: state.lastHeartbeatAt || null,
    blockedCount: Array.isArray(state.blocked) ? state.blocked.length : 0,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const squadDir = path.resolve(options.squadDir);
  const runtimeName = runtimeDirName(squadDir);
  const repoRoot = path.dirname(squadDir);
  const configPath = path.join(squadDir, 'config.json');
  const structurePath = path.join(squadDir, 'org', 'structure.json');
  const contractsDir = path.join(squadDir, 'org', 'contracts');

  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found: ${configPath}`);
  }

  const config = readJson(configPath);
  if (!config.orgMode || !fs.existsSync(structurePath)) {
    writeJson(path.resolve(options.output), {
      enabled: false,
      reason: `orgMode disabled or ${runtimeName}/org/structure.json missing`,
      departments: [],
      contracts: [],
    });
    return;
  }

  const structure = readJson(structurePath);
  const departments = Array.isArray(structure.departments) ? structure.departments : [];
  const heartbeatMinutes = (config.orgConfig && config.orgConfig.heartbeatMinutes) || 15;
  const maxParallelismDefault = (config.orgConfig && config.orgConfig.maxParallelismPerDepartment) || 3;

  const departmentReports = departments.map((department) => {
    const runtime = department.runtime || {};
    const backlogPath = path.resolve(repoRoot, runtime.backlogPath || `${runtimeName}/org/${department.id}/backlog.md`);
    const statePath = path.resolve(repoRoot, runtime.statePath || `${runtimeName}/org/${department.id}/state.json`);
    const backlog = summarizeBacklog(backlogPath);
    const state = summarizeState(statePath, runtime.heartbeatMinutes || heartbeatMinutes);
    const maxParallelism = runtime.maxParallelism || maxParallelismDefault;

    return {
      id: department.id,
      name: department.name,
      lead: department.lead,
      backlogPath: path.relative(repoRoot, backlogPath),
      statePath: path.relative(repoRoot, statePath),
      contracts: runtime.contracts || [],
      backlog,
      state: {
        ...state,
        maxParallelism,
        parallelismBreach: state.activeClaims > maxParallelism,
      },
    };
  });

  const contracts = fs.existsSync(contractsDir)
    ? fs.readdirSync(contractsDir)
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => path.posix.join(runtimeName, 'org', 'contracts', fileName))
    : [];

  writeJson(path.resolve(options.output), {
    enabled: true,
    generatedAt: new Date().toISOString(),
    departments: departmentReports,
    contracts,
  });
}

main();
