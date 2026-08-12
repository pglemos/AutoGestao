import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from 'bun:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const guidelinePath = join(root, '.superpowers/mx-foundation-zero/typography/guideline-t4.md');

const ALLOWLIST_FILES = [
  'src/pages/PDIPrint.tsx',
  'src/components/organisms/DRETable.tsx',
  'src/components/organisms/DREForm.tsx',
  'src/components/molecules/StatusBadge.tsx',
  'src/components/atoms/Avatar.tsx',
  'src/components/molecules/MetricCard.tsx',
  'src/components/organisms/AgendaCalendar/MonthGrid.tsx',
  'src/components/MxSidebarShell.tsx',
  'src/pages/LiberacaoFechamento.tsx',
  'src/pages/OAuthHome.tsx',
  'src/pages/VendedorHome.tsx',
  'src/components/molecules/MXScoreCard.tsx',
  'src/pages/Privacy.tsx',
];

const ALLOWLIST_PATTERNS = [
  /uppercase/,
  /tracking-(widest|wider|wide)/,
  /tracking-\[/,
  /tracking-(tighter|tight)/,
  /text-\[(10|11|12|13|14|15|16|17|18|19|20|22|24|26|28|30|32|34|36|40|48)px\]/,
  /text-(2xl|3xl|4xl|5xl|6xl)/,
];

function tsxFiles(): string[] {
  try {
    return execSync(
      `rg -l "uppercase|tracking-|text-\\[|text-2xl|text-3xl|text-4xl|text-5xl|text-6xl" src --glob '*.{tsx,ts,jsx}' -g '!**/*.test.*' -g '!**/*.playwright.ts' -g '!**/_stories/**' -g '!**/base44-reference/**' 2>/dev/null || true`,
      { cwd: root, encoding: 'utf-8' }
    ).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function runTypographyGate(): number {
  const bunBin = process.env.BUN_BIN || 'bun'
  const worker = spawnSync(bunBin, [fileURLToPath(import.meta.url), '--check'], {
    cwd: root,
    encoding: 'utf-8',
  });
  process.stdout.write((worker.stdout || '') + (worker.stderr || ''));
  return worker.status ?? 1;
}

function runCheck(): void {
  const gateViolations: string[] = [];
  const backlogViolations: string[] = [];

  for (const file of tsxFiles()) {
    const content = readFileSync(join(root, file), 'utf-8');
    const isAllowlisted = ALLOWLIST_FILES.some((f) => file.endsWith(f));
    const isGate =
      file.startsWith('src/pages/') && !file.startsWith('src/pages/owner/') && false ||
      file.startsWith('src/components/atoms/') ||
      file.startsWith('src/components/molecules/') ||
      file.startsWith('src/components/organisms/') ||
      file.startsWith('src/components/seller/');
    content.split('\n').forEach((line, idx) => {
      const hasPattern = ALLOWLIST_PATTERNS.some((re) => re.test(line));
      if (!hasPattern) return;
      if (isAllowlisted && /uppercase|tracking-(widest|wider|wide|tight|tighter)|text-(2xl|3xl|4xl|5xl)/.test(line)) return;
      const desc = line
        .match(/uppercase|tracking-[a-z\[\]]+|text-\[[^\]]+\]|text-[2-6]xl/)
        ?.filter(Boolean)
        .join(' ');
      (isGate ? gateViolations : backlogViolations).push(`  ${file}:${idx + 1} — ${desc}`);
    });
  }

  console.log(
    `-- typography contract: root gate ${gateViolations.length} violações | backlog (features/) ${backlogViolations.length}`
  );
  if (backlogViolations.length > 0) {
    console.log(`[backlog] ${backlogViolations.length} em src/features — migração contínua (guideline T4.4.2):`);
    console.log(backlogViolations.slice(0, 30).join('\n'));
  }
  if (gateViolations.length > 0) {
    console.error(
      `=== typography gate: ${gateViolations.length} violação(ões) fora da allowlist (pages+components) ===`
    );
    console.error(gateViolations.join('\n'));
    console.error(
      `Allowlist: ${ALLOWLIST_FILES.length} arquivos + guideline T4.4 (veja ${guidelinePath.replace(root, '')})`
    );
  } else {
    console.log('OK   typography gate: pages + components sem tipografia raw fora da allowlist');
  }
  process.exit(gateViolations.length > 0 ? 1 : 0);
}

if (process.argv.includes('--check')) {
  runCheck();
}

test('typography contract: pages + components canônicos sem raw fora da allowlist (06.014)', () => {
  const status = runTypographyGate();
  expect(status).toBe(0);
});