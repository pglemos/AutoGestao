#!/usr/bin/env node

// Compare the current migration checksum manifest with the PR base.
// New migrations are allowed; rewrites of an existing migration require an
// explicit, hash-pinned entry in .migration-checksum-allowlist.json.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const manifestPath = 'supabase/migrations/.migration-checksums.json';
const allowlistPath = 'supabase/migrations/.migration-checksum-allowlist.json';
const migrationsDir = 'supabase/migrations';
const baseArgIndex = process.argv.indexOf('--base');
const baseRef = baseArgIndex >= 0 ? process.argv[baseArgIndex + 1] : 'origin/main';

if (!baseRef) {
  console.error('Uso: node scripts/check_migration_checksum_drift.mjs --base <git-ref>');
  process.exit(2);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readBaseJson(path) {
  const content = execFileSync('git', ['show', `${baseRef}:${path}`], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(content);
}

function sha256(path) {
  return createHash('sha256')
    .update(readFileSync(join(root, migrationsDir, path)))
    .digest('hex');
}

const base = readBaseJson(manifestPath);
const current = readJson(manifestPath);
const allowlist = existsSync(join(root, allowlistPath))
  ? readJson(allowlistPath)
  : { allowed: {} };
const allowed = allowlist.allowed || {};
const errors = [];
const usedAllowlist = new Set();
const today = new Date().toISOString().slice(0, 10);

for (const [file, baseHash] of Object.entries(base.checksums || {})) {
  const currentHash = current.checksums?.[file];
  if (!currentHash) {
    errors.push(`Migration registrada removida do manifest: ${file}`);
    continue;
  }
  if (currentHash === baseHash) continue;

  const exception = allowed[file];
  if (!exception) {
    errors.push(`Migration registrada reescrita sem allowlist: ${file}`);
    continue;
  }
  usedAllowlist.add(file);
  if (exception.from !== baseHash || exception.to !== currentHash) {
    errors.push(`Allowlist divergente para ${file}: from/to não correspondem aos hashes da base e do manifest atual`);
  }
  const actualHash = sha256(file);
  if (actualHash !== currentHash) {
    errors.push(`Manifest atual não corresponde ao arquivo: ${file}`);
  }
  if (!exception.reason || !exception.expires_on) {
    errors.push(`Allowlist incompleta para ${file}: reason e expires_on são obrigatórios`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expires_on)) {
    errors.push(`Allowlist inválida para ${file}: expires_on deve usar YYYY-MM-DD`);
  } else if (exception.expires_on < today) {
    errors.push(`Allowlist expirada para ${file}: expires_on=${exception.expires_on}`);
  }
}

for (const file of Object.keys(allowed)) {
  if (!usedAllowlist.has(file)) {
    errors.push(`Allowlist sem rewrite correspondente: ${file}`);
  }
}

if (errors.length) {
  console.error('FALHA — drift de migrations não autorizado:\n' + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

const rewrites = [...usedAllowlist];
const added = Object.keys(current.checksums || {}).filter((file) => !base.checksums?.[file]);
console.log(`OK — ${rewrites.length} rewrite(s) autorizada(s), ${added.length} migration(s) nova(s).`);
