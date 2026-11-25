// Black-box tests for both implementations: node --test statusline.test.mjs
// Build the exe first: zig build-exe statusline.zig -O ReleaseFast
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const EXE = join(DIR, process.platform === 'win32' ? 'statusline.exe' : 'statusline');
const BASE = JSON.parse(readFileSync(join(DIR, 'payload.json'), 'utf8'));

const IMPLS = {
  js: (input) => spawnSync(process.execPath, [join(DIR, 'statusline.mjs')], { input }),
  zig: (input) => spawnSync(EXE, [], { input }),
};

const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', DIM = '\x1b[2m', X = '\x1b[0m';
const H = 3600, D = 86400;

// resets_at is relative to the real clock; offsets carry +20s so a few seconds of
// test runtime never cross a minute or percentage rounding boundary.
const window = (used, leftS) => ({
  used_percentage: used,
  resets_at: Math.floor(Date.now() / 1000) + leftS,
});
const payload = (rate_limits) => JSON.stringify({ ...BASE, rate_limits });

const CASES = [
  {
    name: 'green pace, 5h and 7d (days format)',
    input: () =>
      payload({ five_hour: window(20, 3 * H + 20), seven_day: window(30, 3 * D + 4 * H + 10 * 60 + 20) }),
    expected:
      `Opus 5.5 │ ctx 6% │ ${G}5h 20%token/40%time${X} ${DIM}reset 3h0m${X}` +
      ` │ ${G}7d 30%token/55%time${X} ${DIM}reset 3d4h${X}`,
  },
  {
    name: 'yellow pace, projected limit before reset',
    input: () => payload({ five_hour: window(48, 3 * H + 20) }),
    expected: `Opus 5.5 │ ctx 6% │ ${Y}5h 48%token/40%time${X} ${R}limit≈2h10m${X}`,
  },
  {
    name: 'red pace',
    input: () => payload({ five_hour: window(60, 3 * H + 20) }),
    expected: `Opus 5.5 │ ctx 6% │ ${R}5h 60%token/40%time${X} ${R}limit≈1h20m${X}`,
  },
  {
    name: 'limit reached',
    input: () => payload({ five_hour: window(100, 3 * H + 20) }),
    expected: `Opus 5.5 │ ctx 6% │ ${R}5h 100%token/40%time LIMIT${X} ${DIM}reset 3h0m${X}`,
  },
  {
    name: 'too early in window: no pace color',
    input: () => payload({ five_hour: window(10, 17500) }),
    expected: `Opus 5.5 │ ctx 6% │ 5h 10%token/3%time ${DIM}reset 4h52m${X}`,
  },
  {
    name: 'reset time already passed',
    input: () => payload({ five_hour: window(50, -600) }),
    expected: `Opus 5.5 │ ctx 6% │ ${G}5h 50%token/100%time${X} ${DIM}reset 0h0m${X}`,
  },
  {
    name: 'no rate limits',
    input: () => payload(undefined),
    expected: 'Opus 5.5 │ ctx 6%',
  },
  {
    name: 'incomplete rate limit window is skipped',
    input: () => payload({ five_hour: { used_percentage: 5 }, seven_day: window(30, 3 * D + 4 * H + 10 * 60 + 20) }),
    expected: `Opus 5.5 │ ctx 6% │ ${G}7d 30%token/55%time${X} ${DIM}reset 3d4h${X}`,
  },
  { name: 'empty object', input: () => '{}', expected: 'claude' },
  { name: 'invalid JSON', input: () => 'not json', expected: 'claude' },
  { name: 'empty stdin', input: () => '', expected: 'claude' },
];

for (const [impl, run] of Object.entries(IMPLS)) {
  describe(impl, { skip: impl === 'zig' && !existsSync(EXE) && 'exe not built' }, () => {
    for (const c of CASES) {
      it(c.name, () => {
        const res = run(c.input());
        assert.equal(res.status, 0, res.stderr?.toString());
        assert.equal(res.stdout.toString().replace(/\r?\n$/, ''), c.expected);
      });
    }
  });
}
