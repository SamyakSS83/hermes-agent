# Node wrapping compatibility sources

Vendored from the installed npm packages used by wrap-ansi 9.0.2 at repository
HEAD c697161055. Upstream source SHA-256 values (before TypeScript conversion):

| Package | Version | index.js SHA-256 |
| --- | --- | --- |
| wrap-ansi | 9.0.2 | `b63b3245e7ea7646b4637671afd3e4e59a05e5f25d41205c0d8e758b1f11c1c5` |
| string-width | 7.2.0 | `16421893c66e7c45a68251f0708caaa8d49d74e9570ae574371d21356e9d30a6` |
| ansi-styles | 6.2.3 | `92efdc3e5203d02d1710ff60dea3965066f97a77c0feaaa919b2693c989b7ec1` |

Upstream: https://github.com/chalk/wrap-ansi,
https://github.com/sindresorhus/string-width, https://github.com/chalk/ansi-styles.
Each source carries the upstream MIT license in a preserved `/*! */` comment,
including in esbuild output. No installed packages are patched.

Local changes:
- Type annotations, non-null assertions and repository formatting.
- wrap-ansi measures through `../wrap-width-cache.ts` at **every internal width
  call**, so repeated words/characters/rows survive streaming and resize misses.
- string-width 7.2.0 is kept separate from Ink's deliberately different width
  implementation and from string-width 8 installed at the repository root.
- Only the SGR open/close map from ansi-styles is retained in `ansi-codes.ts`;
  unused style/color conversion APIs are omitted. Color ranges expand to the
  same pairs. This avoids adding an undeclared transitive dependency.
- Existing declared dependencies provide strip-ansi, emoji-regex and
  get-east-asian-width. No package/lockfile change or loader hook is needed.

`wrapAnsi.ts` still selects Bun.wrapAnsi when available. The new Node width
cache is true LRU (like the other Ink caches), bounded to 8192 entries and
262144 UTF-16 key units, with keys over 1024 units measured without retention.
This bounds logical retained string data, not total engine heap/backing-store
allocation. The existing full-output wrap cache is unchanged. Host half/all
cache eviction also clears/reduces this cache without changing the public
InkCacheSizes shape.

When updating upstream: compare the files against these hashes, port only
necessary changes, preserve all license notices, then run wrapAnsi.test.ts
(differential UTF-16 parity against the declared wrap-ansi dependency) and
wrap-width-cache.test.ts. The checked-in deterministic 3588-case corpus comes
from the validated ts-wrap spike: Unicode/control/ANSI/OSC atoms plus seeded
mixtures, including lone surrogates. Test real rendering and benchmark rebuilt
production sources; do not substitute Ink.stringWidth or modernize wrapping
quirks without a separate behavior change.
