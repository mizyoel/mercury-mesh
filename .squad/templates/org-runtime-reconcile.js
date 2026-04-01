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
    output: 'org-runtime-results.json',
    apply: false,
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
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.squadDir) throw new Error('--mesh-dir/--squad-dir requires a value');
  if (!options.output) throw new Error('--output requires a value');
  return options;
}

function printUsage() {
  console.log('Usage: node <runtime>/org/reconcile.js [--mesh-dir .mesh | --squad-dir .squad] --output org-runtime-results.json [--apply]');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ensureDirectory(filePath) {
  const dirPath = path.dirname(filePath);
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendLine(filePath, content) {
  ensureDirectory(filePath);
  fs.appendFileSync(filePath, content, 'utf8');
}

function normalizePath(rootPath, relativePath) {
  if (!relativePath) return null;
  return path.resolve(rootPath, relativePath);
}

function parseMarkdownTable(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      continue;
    }

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (cells.every((cell) => /^-+$/.test(cell))) {
      continue;
    }

    rows.push(cells);
  }

  if (rows.length < 2) {
    return null;
  }

  return {
    headers: rows[0],
    rows: rows.slice(1),
    lines,
  };
}

function serializeMarkdownTable(lines, tableIndex, headers, rows) {
  const formatted = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];

  const nextIndex = tableIndex.start + formatted.length;
  const result = [...lines];
  result.splice(tableIndex.start, tableIndex.end - tableIndex.start, ...formatted);
  return result.join('\n');
}

function locateBacklogTable(lines) {
  let start = -1;
  let end = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (start === -1 && line.startsWith('| ID |')) {
      start = index;
      continue;
    }

    if (start !== -1 && line !== '' && !line.startsWith('|')) {
      end = index;
      break;
    }
  }

  if (start === -1) return null;
  return { start, end };
}

function appendNote(existing, note) {
  if (!existing || existing === '-') return note;
  if (existing.includes(note)) return existing;
  return `${existing}; ${note}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'runtime';
}

function writeDecisionEntry(rootPath, report, timestamp) {
  const facts = [];
  if (report.expiredClaims.length > 0) {
    facts.push(`re-queued ${report.expiredClaims.length} expired claim(s)`);
  }
  if (report.staleHeartbeat) {
    facts.push('detected a stale heartbeat');
  }
  if (report.parallelismBreach) {
    facts.push('detected a parallelism breach');
  }
  if (facts.length === 0) {
    return null;
  }

  const decisionsPath = path.join(rootPath, report.runtimeName, 'decisions', 'inbox', `ralph-org-runtime-${slugify(report.departmentId)}-${timestamp.replace(/[:.]/g, '-')}.md`);
  const workItems = report.expiredClaims.map((claim) => claim.workItemId).join(', ');
  const body = [
    `### ${timestamp}: Org runtime reconcile for ${report.departmentId}`,
    '**By:** Ralph',
    `**Scope:** dept:${report.departmentId}`,
    `**What:** Ralph ${facts.join(', ')}.`,
    `**Why:** Runtime safety check for leases, heartbeats, and department parallelism.${workItems ? ` Affected work items: ${workItems}.` : ''}`,
    '',
  ].join('\n');

  appendLine(decisionsPath, body);
  return path.relative(rootPath, decisionsPath);
}

function reconcileDepartment(rootPath, department, config, applyChanges) {
  const runtime = department.runtime || {};
  const runtimeName = reportRuntimeName(config, rootPath);
  const statePath = normalizePath(rootPath, runtime.statePath || `${runtimeName}/org/${department.id}/state.json`);
  const backlogPath = normalizePath(rootPath, runtime.backlogPath || `${runtimeName}/org/${department.id}/backlog.md`);
  const now = new Date();
  const heartbeatMinutes = runtime.heartbeatMinutes || (config.orgConfig && config.orgConfig.heartbeatMinutes) || 15;
  const maxParallelism = runtime.maxParallelism || (config.orgConfig && config.orgConfig.maxParallelismPerDepartment) || 3;
  const requeueExpiredClaims = config.orgConfig ? config.orgConfig.requeueExpiredClaims !== false : true;

  const report = {
    departmentId: department.id,
    runtimeName,
    backlogPath: path.relative(rootPath, backlogPath),
    statePath: path.relative(rootPath, statePath),
    expiredClaims: [],
    staleHeartbeat: false,
    parallelismBreach: false,
    changesApplied: false,
    notes: [],
  };

  if (!fs.existsSync(statePath)) {
    report.notes.push('state.json not found');
    return report;
  }
  if (!fs.existsSync(backlogPath)) {
    report.notes.push('backlog.md not found');
    return report;
  }

  const state = readJson(statePath);
  const backlogContent = fs.readFileSync(backlogPath, 'utf8');
  const parsedTable = parseMarkdownTable(backlogContent);
  const tableIndex = locateBacklogTable(backlogContent.split(/\r?\n/));

  if (!parsedTable || !tableIndex) {
    report.notes.push('backlog table not found');
    return report;
  }

  const headers = parsedTable.headers;
  const headerIndex = new Map(headers.map((header, index) => [header.toLowerCase(), index]));
  const idIndex = headerIndex.get('id');
  const statusIndex = headerIndex.get('status');
  const ownerIndex = headerIndex.get('owner');
  const leaseIndex = headerIndex.get('lease expires');
  const notesIndex = headerIndex.get('notes');

  const rowById = new Map();
  for (const row of parsedTable.rows) {
    const id = idIndex >= 0 ? row[idIndex] : null;
    if (id) rowById.set(id, row);
  }

  const activeClaims = Array.isArray(state.activeClaims) ? state.activeClaims : [];
  const remainingClaims = [];

  for (const claim of activeClaims) {
    const leaseExpiresAt = claim.leaseExpiresAt ? new Date(claim.leaseExpiresAt) : null;
    const expired = leaseExpiresAt instanceof Date && !Number.isNaN(leaseExpiresAt.valueOf()) && leaseExpiresAt < now;

    if (!expired) {
      remainingClaims.push(claim);
      continue;
    }

    report.expiredClaims.push({
      workItemId: claim.workItemId,
      claimedBy: claim.claimedBy,
      leaseExpiresAt: claim.leaseExpiresAt,
    });

    const backlogRow = rowById.get(claim.workItemId);
    if (backlogRow && requeueExpiredClaims && applyChanges) {
      if (statusIndex >= 0) backlogRow[statusIndex] = 'queued';
      if (ownerIndex >= 0) backlogRow[ownerIndex] = 'unassigned';
      if (leaseIndex >= 0) backlogRow[leaseIndex] = '-';
      if (notesIndex >= 0) {
        backlogRow[notesIndex] = appendNote(backlogRow[notesIndex], `Requeued by Ralph at ${now.toISOString()}`);
      }
      report.changesApplied = true;
      continue;
    }

    remainingClaims.push(claim);
  }

  if (report.expiredClaims.length > 0 && requeueExpiredClaims && applyChanges) {
    state.activeClaims = remainingClaims;
    report.notes.push(`Re-queued ${report.expiredClaims.length} expired claim(s)`);
  }

  const heartbeat = state.lastHeartbeatAt ? new Date(state.lastHeartbeatAt) : null;
  if (heartbeat instanceof Date && !Number.isNaN(heartbeat.valueOf())) {
    const heartbeatAgeMs = now.valueOf() - heartbeat.valueOf();
    report.staleHeartbeat = heartbeatAgeMs > heartbeatMinutes * 60 * 1000;
  } else {
    report.staleHeartbeat = true;
    report.notes.push('Missing or invalid lastHeartbeatAt');
  }

  report.parallelismBreach = remainingClaims.length > maxParallelism;
  if (report.parallelismBreach) {
    report.notes.push(`Active claims (${remainingClaims.length}) exceed maxParallelism (${maxParallelism})`);
  }

  if (report.changesApplied) {
    ensureDirectory(statePath);
    writeJson(statePath, state);

    const backlogLines = backlogContent.split(/\r?\n/);
    const updatedBacklog = serializeMarkdownTable(backlogLines, tableIndex, headers, parsedTable.rows);
    fs.writeFileSync(backlogPath, `${updatedBacklog}\n`, 'utf8');
  }

  if (applyChanges && (report.changesApplied || report.staleHeartbeat || report.parallelismBreach)) {
    const decisionPath = writeDecisionEntry(rootPath, report, now.toISOString());
    if (decisionPath) {
      report.notes.push(`Logged audit entry at ${decisionPath}`);
    }
  }

  return report;
}

function reportRuntimeName(config, rootPath) {
  const runtimePath = config.__runtimeDir || path.join(rootPath, '.squad');
  return runtimeDirName(runtimePath);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const squadDir = path.resolve(options.squadDir);
  const runtimeName = runtimeDirName(squadDir);
  const repoRoot = path.dirname(squadDir);
  const configPath = path.join(squadDir, 'config.json');
  const outputPath = path.resolve(options.output);

  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found: ${configPath}`);
  }

  const config = readJson(configPath);
  config.__runtimeDir = squadDir;
  const structurePath = path.join(squadDir, 'org', 'structure.json');
  if (!config.orgMode || !fs.existsSync(structurePath)) {
    const result = {
      enabled: false,
      reason: `orgMode disabled or ${runtimeName}/org/structure.json missing`,
      departments: [],
    };
    ensureDirectory(outputPath);
    writeJson(outputPath, result);
    return;
  }

  const structure = readJson(structurePath);
  const departments = Array.isArray(structure.departments) ? structure.departments : [];
  const reports = departments.map((department) => reconcileDepartment(repoRoot, department, config, options.apply));

  const result = {
    enabled: true,
    apply: options.apply,
    generatedAt: new Date().toISOString(),
    departments: reports,
  };

  ensureDirectory(outputPath);
  writeJson(outputPath, result);
}

main();
