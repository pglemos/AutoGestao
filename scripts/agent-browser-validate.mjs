#!/usr/bin/env node
/**
 * agent-browser-validate.mjs
 *
 * Predefined hook/validator for AI agents (opencode, Claude Code, Codex).
 * Every time an agent develops/creates/edits/tests anything that touches the
 * UI, this script:
 *   1. Ensures the dev server is running (auto-starts Vite if needed).
 *   2. Opens the app in Chrome via agent-browser (headful, real Chrome).
 *   3. Runs a flow (waits for text, asserts visible elements, custom steps).
 *   4. Captures visual evidence for DESKTOP and MOBILE viewports.
 *   5. Checks for JS errors and optional a11y audit.
 *   6. Writes a summary + screenshots under visual-evidence/.
 *
 * Exit code 0 on success, 1 on failure.
 *
 * Usage:
 *   node scripts/agent-browser-validate.mjs [options]
 *
 * Options:
 *   --url <url>            App URL (default: http://localhost:3457)
 *   --flow <file.json>     Flow definition file (see FLOW FORMAT below)
 *   --desktop <WxH>        Desktop viewport (default: 1440x900)
 *   --mobile <WxH>         Mobile viewport  (default: 390x844)
 *   --label <name>         Label for evidence dir (default: "run")
 *   --evidence-dir <path>  Evidence root (default: visual-evidence/agent-browser)
 *   --keep-open            Keep the Chrome session open after validating
 *   --no-server-start      Do not auto-start the dev server
 *   --a11y                 Also run an accessibility audit
 *   --json                 Print JSON summary to stdout
 *   --quiet                Minimal output
 *
 * FLOW FORMAT (--flow file.json):
 * {
 *   "url": "http://localhost:3457/login",
 *   "waitText": "Bem-vindo",
 *   "assertVisible": ["h1", "[data-testid=login]"],
 *   "assertText": ["Bem-vindo"],
 *   "screenshots": ["desktop", "mobile"],
 *   "steps": [
 *     { "action": "click", "args": ["text=Entrar"] },
 *     { "action": "wait", "args": ["--text", "Dashboard"] }
 *   ]
 * }
 *
 * Environment:
 *   AGENT_BROWSER_BIN   Override path to the agent-browser binary.
 *   AGENT_BROWSER_SESSION  Isolate browser state per session/project.
 */

'use strict';

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_URL = 'http://localhost:3457';
const DEV_PORT = 3457;

const parseArgs = (argv) => {
  const opts = {
    url: DEFAULT_URL,
    flow: null,
    desktop: '1440x900',
    mobile: '390x844',
    label: 'run',
    evidenceDir: path.join(ROOT, 'visual-evidence', 'agent-browser'),
    keepOpen: false,
    noServerStart: false,
    a11y: false,
    json: false,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    switch (a) {
      case '--url': opts.url = val(); break;
      case '--flow': opts.flow = val(); break;
      case '--desktop': opts.desktop = val(); break;
      case '--mobile': opts.mobile = val(); break;
      case '--label': opts.label = val(); break;
      case '--evidence-dir': opts.evidenceDir = val(); break;
      case '--keep-open': opts.keepOpen = true; break;
      case '--no-server-start': opts.noServerStart = true; break;
      case '--a11y': opts.a11y = true; break;
      case '--json': opts.json = true; break;
      case '--quiet': opts.quiet = true; break;
      case '--help':
      case '-h':
        console.log(`agent-browser-validate.mjs — predefined browser validation for agents

Usage:
  node scripts/agent-browser-validate.mjs [options]

Options:
  --url <url>            App URL (default: ${DEFAULT_URL})
  --flow <file.json>     Flow definition file (see header of this file)
  --desktop <WxH>        Desktop viewport (default: ${opts.desktop})
  --mobile <WxH>         Mobile viewport  (default: ${opts.mobile})
  --label <name>         Label for evidence dir (default: run)
  --evidence-dir <path>  Evidence root (default: visual-evidence/agent-browser)
  --keep-open            Keep the Chrome session open after validating
  --no-server-start      Do not auto-start the dev server
  --a11y                 Also run an accessibility audit
  --json                 Print JSON summary to stdout
  --quiet                Minimal output`);
        process.exit(0);
      default:
        // ignore unknown
        break;
    }
  }
  return opts;
};

const opts = parseArgs(process.argv.slice(2));

let currentEvDir = null;

const quiet = opts.quiet || opts.json;
const log = (msg) => { if (!quiet) console.log(msg); };
const warn = (msg) => { if (!quiet) console.warn(`⚠  ${msg}`); };

const findBin = () => {
  if (process.env.AGENT_BROWSER_BIN) return process.env.AGENT_BROWSER_BIN;
  try {
    execFileSync('which', ['agent-browser'], { stdio: 'ignore' });
    return 'agent-browser';
  } catch {
    try {
      const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
      const p = path.join(globalRoot, 'agent-browser', 'bin', 'agent-browser');
      if (fs.existsSync(p)) return p;
    } catch { /* ignore */ }
  }
  throw new Error('agent-browser not found. Install with: npm install -g agent-browser && agent-browser install');
};

const BIN = findBin();

const ab = (args, { timeout = 30000 } = {}) => {
  try {
    const out = execFileSync(BIN, args, {
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out: (out || '').trim(), err: '' };
  } catch (e) {
    const err = (e.stderr ? e.stderr.toString() : '') || (e.stdout ? e.stdout.toString() : '') || e.message;
    return { ok: false, out: e.stdout ? e.stdout.toString().trim() : '', err: err.trim() };
  }
};

const splitViewport = (s) => s.split(/[xX]/).map(Number);

const parseFlowFile = (file) => {
  const raw = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
  return {
    url: raw.url || opts.url,
    waitText: raw.waitText || null,
    assertVisible: raw.assertVisible || [],
    assertText: raw.assertText || [],
    screenshots: raw.screenshots || ['desktop', 'mobile'],
    steps: raw.steps || [],
  };
};

const ensureServer = async (url) => {
  const parsed = new URL(url);
  const port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
  const isUp = await (async () => {
    try {
      const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2500) });
      return r.status < 500;
    } catch {
      return false;
    }
  })();

  if (isUp) return { started: false, port };

  if (opts.noServerStart) {
    throw new Error(`Server not reachable at ${url} (use --no-server-start only if you manage it yourself)`);
  }

  log(`Dev server not reachable at ${url}. Starting Vite on port ${port}...`);
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--port', String(port), '--strictPort', '--host', '0.0.0.0'],
    {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, AGENT_BROWSER_SESSION: undefined },
    }
  );
  child.unref();

  // Wait up to ~90s for the server
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    try {
      const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return { started: true, port };
    } catch { /* retry */ }
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
};

const main = async () => {
  const start = Date.now();
  const summary = {
    tool: 'agent-browser',
    bin: BIN,
    status: 'pending',
    url: opts.url,
    label: opts.label,
    desktop: opts.desktop,
    mobile: opts.mobile,
    startedAt: new Date().toISOString(),
    elapsedMs: 0,
    failures: [],
    screenshots: [],
    errors: [],
    a11y: null,
    serverStarted: false,
  };

  try {
    const flow = opts.flow ? parseFlowFile(opts.flow) : null;
    const url = flow ? flow.url : opts.url;
    summary.url = url;

    const server = await ensureServer(url);
    summary.serverStarted = server.started;

    const [dW, dH] = splitViewport(opts.desktop);
    const [mW, mH] = splitViewport(opts.mobile);

    const label = `${opts.label}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    const evDir = path.join(opts.evidenceDir, label);
    currentEvDir = evDir;
    fs.mkdirSync(evDir, { recursive: true });

    const envSession = process.env.AGENT_BROWSER_SESSION;
    const sessionArgs = envSession ? ['--session', envSession] : [];

    const run = (cmd) => {
      const r = ab([...sessionArgs, ...cmd]);
      if (!r.ok) {
        summary.failures.push({ cmd: cmd.join(' '), error: r.err || r.out });
        warn(`FAIL: agent-browser ${cmd.join(' ')}\n  ${r.err || r.out}`);
      }
      return r;
    };

    log(`Opening ${url} in Chrome (agent-browser)...`);
    run(['open', url]);

    // Wait for the page to settle
    run(['wait', '--load', 'networkidle']);
    if (!summary.failures.length) await sleep(1500);

    // Flow-specific waits / steps
    if (flow && flow.waitText) {
      log(`Waiting for text "${flow.waitText}"...`);
      run(['wait', '--text', flow.waitText]);
    }
    for (const step of (flow?.steps || [])) {
      log(`Step: agent-browser ${[step.action, ...(step.args || [])].join(' ')}`);
      run([step.action, ...(step.args || [])]);
    }

    // Assertions
    for (const sel of (flow?.assertVisible || [])) {
      const r = ab([...sessionArgs, 'is', 'visible', sel]);
      if (!r.ok) {
        summary.failures.push({ cmd: `is visible ${sel}`, error: r.err || r.out });
        warn(`Assert visible FAILED: ${sel}`);
      }
    }
    for (const txt of (flow?.assertText || [])) {
      const r = ab(['eval', `document.body.innerText.includes(${JSON.stringify(txt)})`]);
      const ok = r.ok && /true/i.test(r.out);
      if (!ok) {
        summary.failures.push({ cmd: `assertText ${txt}`, error: r.err || r.out });
        warn(`Assert text FAILED: "${txt}"`);
      }
    }

    // Screenshots — desktop + mobile (with 1 retry on transient timeout)
    const wanted = flow?.screenshots || ['desktop', 'mobile'];
    const desktopShot = path.join(evDir, 'desktop.png');
    const mobileShot = path.join(evDir, 'mobile.png');
    const shoot = (shotPath, w, h, name) => {
      log(`Screenshot ${name} (${w}x${h})...`);
      const set = run(['set', 'viewport', String(w), String(h)]);
      let r = ab([...sessionArgs, 'screenshot', '--full', shotPath], { timeout: 45000 });
      if (!r.ok && /timedout|ETIMEDOUT/i.test(r.err)) {
        warn(`Screenshot ${name} timed out — retrying...`);
        r = ab([...sessionArgs, 'screenshot', '--full', shotPath], { timeout: 45000 });
      }
      if (!r.ok) summary.failures.push({ cmd: `screenshot ${name}`, error: r.err || r.out });
      summary.screenshots.push(shotPath);
    };
    if (wanted.includes('desktop')) shoot(desktopShot, dW, dH, 'DESKTOP');
    if (wanted.includes('mobile')) shoot(mobileShot, mW, mH, 'MOBILE');

    // JS errors
    const errRes = run(['errors']);
    const errJson = errRes.ok ? safeParse(errRes.out) : null;
    if (errJson?.errors?.length) {
      summary.errors = errJson.errors;
      summary.failures.push({ cmd: 'errors', error: `${errJson.errors.length} uncaught JS error(s)` });
      warn(`Found ${errJson.errors.length} uncaught JS error(s)`);
    }

    // Optional a11y audit
    if (opts.a11y) {
      log('Running a11y audit (axe-core)...');
      const aRes = run(['a11y', '--json']);
      const aJson = aRes.ok ? safeParse(aRes.out) : null;
      summary.a11y = aJson
        ? { violations: aJson.counts?.violations ?? aJson.violations?.length ?? 0, incomplete: aJson.counts?.incomplete ?? aJson.incomplete?.length ?? 0 }
        : null;
      const v = summary.a11y?.violations ?? 0;
      if (v > 0) {
        summary.failures.push({ cmd: 'a11y', error: `${v} a11y violation(s)` });
        warn(`${v} a11y violation(s)`);
      }
    }

    if (!opts.keepOpen) run(['close']);

    summary.status = summary.failures.length === 0 ? 'passed' : 'failed';
  } catch (e) {
    summary.status = 'error';
    summary.failures.push({ cmd: 'setup', error: e.message });
    warn(`Validation error: ${e.message}`);
  } finally {
    summary.elapsedMs = Date.now() - start;
    summary.finishedAt = new Date().toISOString();

    if (!opts.keepOpen) {
      try { ab(['close']); } catch { /* ignore */ }
    }

    if (currentEvDir && fs.existsSync(currentEvDir)) {
      fs.writeFileSync(path.join(currentEvDir, 'summary.json'), JSON.stringify(summary, null, 2));
      fs.writeFileSync(
        path.join(currentEvDir, 'summary.md'),
        `# agent-browser validation: ${summary.label}\n\n- Status: **${summary.status}**\n- URL: ${summary.url}\n- Desktop: ${summary.desktop} / Mobile: ${summary.mobile}\n- Elapsed: ${summary.elapsedMs}ms\n\n## Failures\n${summary.failures.length ? summary.failures.map((f) => `- \`${f.cmd}\`: ${f.error}`).join('\n') : 'None'}\n\n## Screenshots\n${summary.screenshots.map((s) => `- ${path.relative(ROOT, s)}`).join('\n') || 'None'}\n`
      );
    }

    if (opts.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      log(`\n=== agent-browser validation ${summary.status.toUpperCase()} ===`);
      log(`URL: ${summary.url} | Desktop: ${summary.desktop} | Mobile: ${summary.mobile}`);
      log(`Elapsed: ${summary.elapsedMs}ms | Failures: ${summary.failures.length}`);
      if (summary.screenshots.length) {
        log(`Screenshots:`);
        for (const s of summary.screenshots) log(`  - ${path.relative(ROOT, s)}`);
      }
    }

    process.exit(summary.status === 'passed' ? 0 : 1);
  }
};

const safeParse = (str) => {
  try { return JSON.parse(str); } catch { return null; }
};

main();