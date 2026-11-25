// ~/.claude/statusline.mjs
import { text } from 'node:stream/consumers';

const WINDOW_MS = { five_hour: 5 * 3600e3, seven_day: 7 * 86400e3 };
const C = {
  g: '\x1b[32m',
  y: '\x1b[33m',
  r: '\x1b[31m',
  dim: '\x1b[2m',
  x: '\x1b[0m',
};

const fmt = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 1440
    ? `${Math.floor(m / 1440)}d${Math.floor((m % 1440) / 60)}h`
    : `${Math.floor(m / 60)}h${m % 60}m`;
};

function segment(label, key, rateLimits) {
  const w = rateLimits?.[key];
  if (w?.used_percentage == null || w.resets_at == null) return null;

  const total = WINDOW_MS[key];
  const leftMs = w.resets_at * 1000 - Date.now(); // resets_at: epoch seconds
  const elapsedMs = Math.min(total, Math.max(0, total - leftMs));
  const used = w.used_percentage;
  const elapsed = (elapsedMs / total) * 100;

  const head = `${label} ${Math.round(used)}%token/${Math.round(elapsed)}%time`;
  const reset = `${C.dim}reset ${fmt(leftMs)}${C.x}`;

  if (used >= 100) return `${C.r}${head} LIMIT${C.x} ${reset}`;
  // Too early in the window (or nothing used): pace is noise
  if (elapsed < 5 || used <= 0) return `${head} ${reset}`;

  const ratio = used / elapsed;
  const col = ratio <= 1 ? C.g : ratio <= 1.25 ? C.y : C.r;

  // Linear extrapolation: remaining quota / current burn rate
  const toLimitMs = ((100 - used) / used) * elapsedMs;
  const tail =
    toLimitMs < leftMs ? `${C.r}limit≈${fmt(toLimitMs)}${C.x}` : reset;

  return `${col}${head}${C.x} ${tail}`;
}

let out = 'claude';
try {
  const d = JSON.parse(await text(process.stdin));
  const ctx = d.context_window?.used_percentage;
  const parts = [
    d.model?.display_name,
    ctx != null ? `ctx ${Math.round(ctx)}%` : null,
    segment('5h', 'five_hour', d.rate_limits),
    segment('7d', 'seven_day', d.rate_limits),
  ].filter(Boolean);
  if (parts.length) out = parts.join(' │ ');
} catch {
  // never exit non-zero: a failing script blanks the status line
}
console.log(out);
