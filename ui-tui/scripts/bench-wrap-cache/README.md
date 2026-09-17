# Node wrapping cache benchmark

This fork caches nested string-width measurements inside the Node wrap-ansi path.
It does not port rendering to Rust or claim faster model generation. The cache
retains at most 8192 keys / 262144 UTF-16 units and bypasses keys over 1024 units.
Bun's existing native dispatch remains unchanged; Bun was unavailable for testing.

## Reproduce

Requires Node/npm compatible with the repo, installed workspace dependencies and
built Ink artifacts in both checkouts. Baseline: upstream 98f758ae7e (the original
measurement used c697161055, whose TS tree is identical). From the fork root:

```sh
npm run build:ink --workspace ui-tui
# Build Ink in the baseline checkout too, with the same lockfile/dependencies.
export BENCH_BASELINE=/absolute/path/to/baseline-checkout
export BENCH_OUT=/absolute/path/to/empty-scratch-output
mkdir -p "$BENCH_OUT"
# Bundles externalize packages; make the same installed dependencies resolvable.
ln -s "$PWD/node_modules" "$BENCH_OUT/node_modules"
node ui-tui/scripts/bench-wrap-cache/build.mjs
node ui-tui/scripts/bench-wrap-cache/repeat.mjs
```

The harness reconstructs a fixed Unicode/markdown transcript from disjoint
64-UTF-16-unit chunks, renders growing prefixes using real StreamingMd/Ink, and
compares 131 updates with and without 11 resize events. Seven alternating-order
fresh-process rounds per variant/workload follow an untimed warmup. Hashes cover
rendered stdout. There are no model calls. This uses synthetic PassThrough streams,
not interactive PTY latency. Results depend on workload, Node and host load.

## Parent-verified measurement

Linux, Node v26.9.0; rebuilt baseline and integrated artifacts; seven rounds:

| Cumulative workload | Baseline median total | Integrated median total |
|---|---:|---:|
| Stream | 85.316 ms | 67.828 ms |
| Stream + resize | 99.259 ms | 75.313 ms |

About 17.5–23.9 ms less rendering work over the complete 131-update workload
(~20.5–24.1%). These are not per-token latency savings, universal gains, or cold
startup measurements. Hashes matched within each workload across all variants.
Raw aggregate samples and summaries are adjacent JSON files.

Earlier experiment reports had inconsistent chunk handling: concatenating already
growing prefixes duplicated prior text. Their ~6% result and earlier workload
labels are superseded by this corrected harness and measurement. An assertion
checks that concatenating disjoint chunks reconstructs the transcript exactly.

## Compatibility and test evidence

Parent reran Ink build, TUI production build, typecheck, lint and the full TUI
suite: 171 files, 1775 tests passed; lint has zero errors and four existing warnings.
Parent also reran differential comparisons of rebuilt public wrapAnsi (3588 cases)
and wrap-text across seven modes (25116 comparisons), with zero mismatches.
The committed differential corpus and tests live under packages/hermes-ink/src/ink.
No Rust is shipped: the prototype had Unicode/ANSI semantic mismatches.

The full Python run before restoring the rejected BM25 change reported 51101
passed, 7 failed, 531 skipped. All failures were reproduced on upstream or explained
by the host environment (disk readiness passes when TMP points to scratch).
BM25 production code is restored byte-for-byte to upstream; 84 targeted tests pass.
This is not a claim that the entire cross-platform suite is green. Windows, macOS,
Bun, connected providers and real terminal latency were not validated here.
