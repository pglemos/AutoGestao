#!/usr/bin/env node
/**
 * Claude Code Hook: Agent-Browser Auto-Validation (Stop)
 *
 * Registered as Stop event — fires after the agent finishes responding.
 * Reads JSON from stdin (Claude Code hook protocol). If the turn changed
 * UI files (src/, public/, index.html, vite.config.ts, components.json),
 * this hook spawns `scripts/agent-browser-validate.mjs` in the background:
 * it opens Chrome, validates the flow and captures DESKTOP + MOBILE visual
 * evidence under visual-evidence/agent-browser/.
 *
 * The spawn is detached so the hook returns immediately and never blocks
 * the agent's response. Set AGENT_BROWSER_AUTOVALIDATE=0 to disable.
 *
 * Stdin format (Stop):
 * {
 *   "session_id": "abc123",
 *   "transcript_path": "/path/to/session.jsonl",
 *   "cwd": "/path/to/project",
 *   "hook_event_name": "Stop",
 *   "stop_hook_active": true,
 *   "tool_use_id": null
 * }
 */

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_TIMEOUT_MS = 9000;

const UI_PATHS = ['src', 'public', 'index.html', 'vite.config.ts', 'components.json'];

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('error', (e) => reject(e));
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
  });
}

function getChangedUiFiles(cwd) {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out
      .split('\n')
      .map((line) => line.slice(3).trim())
      .filter(Boolean)
      .filter((file) => UI_PATHS.some((p) => file === p || file.startsWith(`${p}/`)));
  } catch {
    return [];
  }
}

function main() {
  if (process.env.AGENT_BROWSER_AUTOVALIDATE === '0') {
    process.exitCode = 0;
    return;
  }

  return readStdin()
    .then((input) => {
      const cwd = input.cwd || PROJECT_ROOT;
      const changed = getChangedUiFiles(cwd);
      if (changed.length === 0) {
        process.exitCode = 0;
        return;
      }

      // Spawn detached so the hook returns immediately.
      const script = path.join(PROJECT_ROOT, 'scripts', 'agent-browser-validate.mjs');
      const flow = path.join(PROJECT_ROOT, 'scripts', 'browser-flows', 'default.flow.json');
      const child = require('child_process').spawn(
        process.execPath,
        [script, '--flow', flow, '--label', 'claude-stop-hook'],
        {
          cwd: PROJECT_ROOT,
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            AGENT_BROWSER_SESSION: 'mx-predictive',
            AGENT_BROWSER_AUTOVALIDATE: '0',
          },
        },
      );
      child.unref();
      process.exitCode = 0;
    })
    .catch(() => {
      process.exitCode = 0;
    });
}

const timer = setTimeout(() => process.exit(0), HOOK_TIMEOUT_MS);
timer.unref();
main();

module.exports = { readStdin, getChangedUiFiles, main, HOOK_TIMEOUT_MS };