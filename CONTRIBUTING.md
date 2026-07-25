# Contributing / Design Notes

This project is a single file, [src/main.purus](src/main.purus), written in
[Purus](https://purus.work) and run directly with `purus run` (no JS build
step). This document covers the parts of the design that aren't obvious from
reading the code.

## Scheduling

`CONFIG.times` is a list of `[hour, minute]` pairs, not a single cron
expression. Each pair is registered as its own `node-cron` job (`cron-expr-for`
turns `[9, 10]` into `"10 9 * * *"`), so times don't need to share a minute the
way a single `hour-list` cron expression would require.

## Limit detection

Detecting "Claude hit its session/weekly usage limit" is inherently a
best-effort heuristic — there is no CLI flag or API for querying quota state
without actually sending a message (`claude auth status --json` only reports
login state, and the `/usage` slash command doesn't work in `-p` mode).

Two guards keep false positives down:

1. **Structural gate (primary):** `run-claude` only checks the limit patterns
   at all when the call already looked abnormal — a non-zero exit, or
   `is_error: true` in the `--output-format json` body. A clean, successful
   response is never tested against `LIMIT-PATTERNS`, so it can't false-match
   by construction.
2. **Paired-phrase match (fallback):** within that "already abnormal" text,
   `is-limit-reached` requires a match from **both** `LIMIT-PATTERNS` (e.g.
   `usage limit`, `session limit`) **and** `RESET-PATTERNS` (e.g. `resets 3pm`,
   `try again in 5 hours`) — not either alone.

The paired-match requirement exists because of a real false positive found
during testing: running inside this project's own directory, Claude sometimes
answers the "tell me a word for your project idea" task by describing the
project itself ("...breaking through session limits...") — a perfectly normal,
non-error response that happened to contain the word "limit". A genuine limit
message always comes with a concrete reset time; ordinary prose describing the
concept does not. Guard 1 alone would already have caught this specific case
(the response was `is_error: false`), but guard 2 exists for the case where an
error response contains "limit" incidentally without being a real usage-limit
condition.

If you see a limit skip that looks wrong, the logged snippet (and the Discord
notification, if configured) includes the matched text — check it before
tightening the patterns further.

## Login check

`claude auth status --json` runs before every scheduled call. It's a local
credential check with no API/usage cost, so it's safe to run unconditionally.
`check-login` returns `null` (not `false`) when the check itself fails, so a
flaky status command can't falsely block a real attempt — only an explicit
`loggedIn: false` skips the run.

## i18n

User-facing strings live in [src/locales/en.json5](src/locales/en.json5) and
[src/locales/ja.json5](src/locales/ja.json5) — [JSON5](https://json5.org/) so
translators can leave comments and use trailing commas. They're read with
`readFileSync` + `JSON5.parse` rather than a native JSON import attribute,
since `import ... with { type: "json" }` only accepts strict JSON. Loaded via
[i18next](https://www.i18next.com/) with both locales passed as inline
`resources` (no backend plugin, so `t()` is usable immediately after
`i18next.init[...]` with no `await` needed). Add a new string as a key in both
files and reference it with `t[//;key;//]` or
`t[//;key;//; [param be value]]` for `{{param}}` interpolation.

`interpolation.escapeValue` is set to `false` in `init` — i18next HTML-escapes
interpolated values by default (a browser-XSS precaution), which is wrong here
and silently turned `Asia/Tokyo` into `Asia&#x2F;Tokyo` in terminal/Discord
output before this was caught.

`CONFIG.lang` is resolved once at startup from `process.env.LANG` (`ja` or
`en`, default `en`; only the first two characters are checked, so
`ja_JP.UTF-8` works). `dotenv.config` is called with `override: true` so a
project-local `.env` wins over an inherited OS `LANG` — most Linux servers
already have one set.

## Library choices

- `run-cmd` wraps `execFile` with Node's built-in `util.promisify` instead of
  a hand-rolled `new Promise[...]` callback wrapper. `promisify`'s rejection
  error has `.stdout`/`.stderr` attached (same as the callback form), so
  `run-cmd` still normalizes to an always-resolving `[error, stdout, stderr]`
  tuple and the rest of `run-claude` didn't need to change.
- `JSON.parse` calls go through the `p-json` stdlib module (`j.parse`) instead
  of the global directly, for consistency with the rest of the codebase's
  stdlib-first strings/random/datetime usage. It's a thin wrapper with
  identical throw behavior.
- Date/time formatting and random task selection use `p-datetime` / `p-random`
  instead of a date library or `Math.random()`, since Purus's stdlib already
  covers both (see `now`, `pick-task`).
- Array helpers with no `p-array` equivalent (`map`, `join`, `some`) stay as
  native `Array.prototype` methods — `p-array`'s API doesn't cover them.

## Error message priority

When a call fails, `err-text` prefers `response.text` (Claude's own error
description from the parsed JSON body) over `error.message` (execFile's
generic `"Command failed: ..."` wrapper) whenever the JSON parsed at all —
it's more specific and doesn't include shell noise.

## Purus gotchas hit while building this

- `fn name args to expr` (named function, expression body) does **not**
  auto-return — you need `to return expr`. Only the anonymous form
  (`fn args to expr`, e.g. an object-property value or callback) auto-returns
  like a JS arrow function.
- A method chain (`.a[].b[]`) must stay on one line; splitting it across lines
  silently breaks into separate statements instead of continuing the chain.
- `import.meta.url` and bare `require[...]` both compile to `undefined(...)`
  in v1.1.0 despite being documented — avoided entirely here (paths are
  resolved relative to `process.cwd()` instead).
- A single-element nested array literal, e.g. `[[0, 0]]`, can compile with the
  outer wrapper collapsed to `[0, 0]`. Not hit in shipped code (`CONFIG.times`
  always has 4+ entries) — only surfaced while trimming a test fixture down to
  one entry — but worth knowing if you ever shrink `CONFIG.times` to length 1.
- Regex literals containing `(` `)` `{` `}` trip the `no-js-chars` lint rule
  even though the compiler accepts them; `LIMIT-PATTERNS`/`RESET-PATTERNS` are
  written as flat alternatives instead of using groups/quantifier braces.

## Development

```bash
npm run lint     # purus-lint static analysis
npm run format   # prettier + prettier-plugin-purus
```

`purus check src/main.purus` type/syntax-checks without running anything.
