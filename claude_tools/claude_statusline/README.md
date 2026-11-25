# claude_statusline

A Claude Code [status line](https://docs.claude.com/en/docs/claude-code/statusline) that shows
the model, context usage and the 5h / 7d rate-limit pace:

```
Opus 5.5 │ ctx 6% │ 5h 20%token/40%time reset 3h0m │ 7d 30%token/55%time reset 3d4h
```

There are two implementations that produce the same output:

| File             | Runtime            |
| ---------------- | ------------------ |
| `statusline.mjs` | Node.js (ESM)      |
| `statusline.zig` | Zig 0.15.2, built to a native exe |

## How a segment reads

`5h 48%token/40%time limit≈2h10m`

- `48%token`: how much of the window's quota is used.
- `40%time`: how much of the window has passed.
- Color shows the pace (`token / time`): green if it's ≤ 1, yellow if it's ≤ 1.25, red above that.
- The tail is `reset <time>` until the window resets, or a red `limit≈<time>` when the current
  rate would hit the limit before the reset (a straight-line estimate).
- `LIMIT` (red) means 100% is used.
- In the first 5% of a window, or with nothing used yet, there's no color because the pace is
  just noise that early.
- If the input is broken or empty, the output is `claude`. The script never exits non-zero,
  because a failing script blanks the status line.

## Build

```sh
zig build-exe statusline.zig                         # debug build: safety checks on, ~1 MB
```

### Production build

```sh
zig build-exe statusline.zig -O ReleaseSmall -fstrip -fsingle-threaded
```

This is a personal script, built and run on the same machine, so Zig's default of tuning for
the local CPU (`-mcpu=native`) is the right choice.

| Flag                | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `-O ReleaseSmall`   | Full optimization tuned for size; turns off runtime safety checks.           |
| `-fstrip`           | Drops debug info, so there's no `.pdb` on Windows.                           |
| `-fsingle-threaded` | The program uses one thread, so thread-safety code can be dropped.           |

`ReleaseSmall` vs `ReleaseFast` (Windows x86_64, 50 runs each):

| Build                                        | Size   | Median run |
| -------------------------------------------- | ------ | ---------- |
| `-O ReleaseFast`                             | 255 KB + 1 MB `.pdb` | 3.37 ms |
| `-O ReleaseFast -fstrip -fsingle-threaded`   | 101 KB | 3.29 ms    |
| `-O ReleaseSmall -fstrip -fsingle-threaded`  | 69 KB  | 3.31 ms    |

Run time is the same within noise: process startup takes almost all of it, and the program's
own work is tiny. Use `ReleaseSmall` because it gives the smallest binary at no speed cost.
Keep `ReleaseSafe` (optimized, with safety checks still on) for chasing a suspected bug.

On Linux and macOS the output is `statusline`, with no extension. `statusline.test.mjs`
already looks for that name.

In PowerShell, quote any flag that contains `=` together with a path, for example
`"-femit-bin=out/statusline.exe"`. Otherwise PowerShell splits the argument at the `.`
and Zig fails with `unrecognized file extension`.

## Use

In `~/.claude/settings.json`:

```json
{ "statusLine": { "type": "command", "command": "C:/path/to/claude_statusline/statusline.exe" } }
```

or, for the Node version:

```json
{ "statusLine": { "type": "command", "command": "node C:/path/to/claude_statusline/statusline.mjs" } }
```

## Test

```sh
zig test statusline.zig        # Zig unit tests (fixed clock)
node --test statusline.test.mjs  # runs both implementations through the same cases (needs the exe built)
```

`payload.json` is a sample status-line input with the private data replaced by placeholders.
The black-box tests use it as a base and set `rate_limits.*.resets_at` relative to the
current clock.

## Updating after a JS change

`statusline.mjs` is the source of truth, and `statusline.zig` follows it. When you change the
JS:

1. **Edit `statusline.mjs`** and add or adjust a case in `CASES` in `statusline.test.mjs` for
   the new behavior. Check it against the JS on its own:
   ```sh
   node --test --test-name-pattern="^js" statusline.test.mjs
   ```
   You can also try it by hand: `Get-Content payload.json -Raw | node statusline.mjs`.
   If the input has new fields, add sample values to `payload.json`, using placeholders for
   anything private.

2. **Ask Claude Code to port the change**, from this directory:
   ```
   statusline.mjs changed (see `git diff` / the diff below). Port the change to
   statusline.zig (Zig 0.15.2), keeping the output byte-identical. Update the Zig unit
   tests at the bottom of statusline.zig if the segment logic changed. Then build with
   `zig build-exe statusline.zig -O ReleaseSmall -fstrip -fsingle-threaded`, and run
   `zig test statusline.zig` and `node --test statusline.test.mjs`. Iterate until both
   pass.
   ```
   If the directory isn't under git, paste the old and new JS, or describe the change.

   Things the port has to match exactly, so point Claude at them if a test fails:
   - JS `Math.round` rounds halves up (toward +∞). Use `jsRound`, not `@round`, which rounds
     halves away from zero.
   - JS `?.` / `== null` checks become the `field()` / `num()` helpers. A missing or
     non-number value gives `null`.
   - In Zig 0.15, a type's `format` method takes `(self, *std.Io.Writer)` and is printed
     with `{f}`. stdin and stdout go through `std.fs.File.*().reader/writer(&buf).interface`.
   - Every error must still print `claude` and exit 0.

3. **Rebuild and retest yourself**, so you're not relying only on Claude's word:
   ```sh
   zig build-exe statusline.zig -O ReleaseSmall -fstrip -fsingle-threaded
   zig test statusline.zig
   node --test statusline.test.mjs
   ```
   All `js` and `zig` cases must pass. The black-box suite is what proves the two versions
   match, so a new behavior needs a case there, not only a Zig unit test.

4. **Optionally, re-run the benchmark** (see [Performance](#performance)) if the change adds
   real work, such as reading a file or calling git.

## Performance

Measured on Windows 11 in PowerShell 7 with Node v24.11.1. Each command ran 50 times,
with `payload.json` piped to stdin, after a few warm-up runs:

```powershell
$p = Get-Content payload.json -Raw
Measure-Command { $p | node statusline.mjs | Out-Null }
Measure-Command { $p | .\statusline.exe   | Out-Null }
```

| Command                         | Mean    | Median  | Min     | Max     |
| ------------------------------- | ------- | ------- | ------- | ------- |
| `node statusline.mjs`           | 33.8 ms | 33.6 ms | 32.6 ms | 45.5 ms |
| `statusline.exe` (Zig)          | 3.7 ms  | 3.4 ms  | 3.2 ms  | 12.2 ms |
| `node -e 0` (empty Node)        | 27.5 ms | 27.2 ms | n/a     | n/a     |
| `cmd /c rem` (empty cmd, for scale) | 7.7 ms | 7.4 ms | 7.0 ms | 20.1 ms |

What the numbers mean:

- The Zig exe is about **9–10× faster**, saving about **30 ms on each status-line refresh**.
  Its run time is close to the cost of starting any process at all; it's faster than even an
  empty `cmd`.
- About 80% of the Node time (~27 ms) is just starting Node. The script itself costs only
  ~6 ms (loading the ESM module, parsing JSON). Tuning the JS can't remove the startup cost;
  only a native binary can.
- For one refresh, 30 ms is hard to notice. It adds up because Claude Code re-runs the
  command on every status-line update. A native exe also doesn't need Node on the machine.
  It probably uses much less memory too, but that wasn't measured.
- Your timings will differ by machine and antivirus. Windows Defender scanning a new exe can
  make the first runs slower.
