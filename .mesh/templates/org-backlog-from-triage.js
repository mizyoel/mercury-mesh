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
    triageFile: 'triage-results.json',
    output: 'org-backlog-results.json',
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mesh-dir') {
      options.meshDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--triage-file') {
      options.triageFile = argv[index + 1];
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

  return options;
}

function printUsage() {
  console.log('Usage: node <runtime>/org/backlog-from-triage.js [--mesh-dir .mesh] --triage-file triage-results.json --output org-backlog-results.json [--apply]');
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
  return start === -1 ? null : { start, end };
}

function serializeMarkdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
}

function updateBacklogFile(backlogPath, addRows, apply) {
  const existing = fs.readFileSync(backlogPath, 'utf8');
  const lines = existing.split(/\r?\n/);
  const table = parseMarkdownTable(existing);
  const tableIndex = locateBacklogTable(lines);

  if (!table || !tableIndex) {
    throw new Error(`Backlog table not found in ${backlogPath}`);
  }

  const headers = table.headers;
  const updatedRows = [...table.rows, ...addRows];
  const renderedTable = serializeMarkdownTable(headers, updatedRows);
  const nextLines = [...lines];
  nextLines.splice(tableIndex.start, tableIndex.end - tableIndex.start, ...renderedTable);

  if (apply) {
    fs.writeFileSync(backlogPath, `${nextLines.join('\n')}\n`, 'utf8');
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const meshDir = path.resolve(options.meshDir);
  const runtimeName = runtimeDirName(meshDir);
  const repoRoot = path.dirname(meshDir);
  const configPath = path.join(meshDir, 'config.json');
  const structurePath = path.join(meshDir, 'org', 'structure.json');
  const triagePath = path.resolve(options.triageFile);

  if (!fs.existsSync(configPath)) throw new Error(`config.json not found: ${configPath}`);
  if (!fs.existsSync(structurePath)) throw new Error(`structure.json not found: ${structurePath}`);
  if (!fs.existsSync(triagePath)) throw new Error(`triage file not found: ${triagePath}`);

  const config = readJson(configPath);
  if (!config.orgMode) {
    writeJson(path.resolve(options.output), { enabled: false, reason: 'orgMode disabled', created: [] });
    return;
  }

  const structure = readJson(structurePath);
  const triageResults = readJson(triagePath);
  const departments = new Map((structure.departments || []).map((department) => [department.id, department]));
  const report = { enabled: true, apply: options.apply, generatedAt: new Date().toISOString(), created: [], skipped: [], warnings: [] };
  const rowsByBacklog = new Map();

  for (const item of triageResults) {
    if (!item.departmentId) {
      report.skipped.push({ issueNumber: item.issueNumber, reason: 'No department assigned' });
      continue;
    }

    const department = departments.get(item.departmentId);
    if (!department) {
      report.warnings.push(`Unknown department: ${item.departmentId} for issue #${item.issueNumber}`);
      continue;
    }

    const runtime = department.runtime || {};
    const backlogPath = path.resolve(repoRoot, runtime.backlogPath || `${runtimeName}/org/${department.id}/backlog.md`);
    if (!fs.existsSync(backlogPath)) {
      report.warnings.push(`Backlog missing for department ${department.id}: ${path.relative(repoRoot, backlogPath)}`);
      continue;
    }

    const packetId = `${department.id}-issue-${item.issueNumber}`;
    const existing = fs.readFileSync(backlogPath, 'utf8');
    if (existing.includes(`| ${packetId} |`)) {
      report.skipped.push({ issueNumber: item.issueNumber, reason: `Packet already exists in ${path.relative(repoRoot, backlogPath)}` });
      continue;
    }

    const title = (item.issueTitle || `Issue #${item.issueNumber}`).replace(/\|/g, '/');
    const assignedTo = item.assignTo || 'unassigned';
    const notes = [`Issue #${item.issueNumber}`, `Routed to ${assignedTo}`, item.source ? `source:${item.source}` : null].filter(Boolean).join('; ');
    const row = [packetId, `[Issue #${item.issueNumber}] ${title}`, 'queued', 'unassigned', '-', '-', '-', notes];

    if (!rowsByBacklog.has(backlogPath)) rowsByBacklog.set(backlogPath, []);
    rowsByBacklog.get(backlogPath).push(row);
    report.created.push({ issueNumber: item.issueNumber, backlogPath: path.relative(repoRoot, backlogPath), packetId, departmentId: item.departmentId });
  }

  for (const [backlogPath, rows] of rowsByBacklog.entries()) {
    updateBacklogFile(backlogPath, rows, options.apply);
  }

  writeJson(path.resolve(options.output), report);
}

main();
