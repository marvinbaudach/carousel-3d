# Loading Screen Optimization — Honest Progress, Feed Strip, Cheaper Globe

**Date:** 2026-07-10
**Status:** Approved
**Scope:** `src/components/LoadingScreen.tsx` and a small, additive change to the
data layer (`src/data/sources.ts`). The staged boot beat (`BOOT_MS = 2400` in
`App.tsx`) and the entire converge / iris / flash exit choreography stay
**untouched**. Mobile font/positioning is already done in prior commits and is
not revisited. No new dependencies.

## Goal

Three reinforcing improvements, chosen by the user (render performance, visual
polish, perceived speed — explicitly *not* cutting the 2.4s boot beat):

1. **Honest progress + feed strip** — the ring `pct` is currently a lie (eases
   to 92, snaps to 100 on the timer). Tie it to real feed arrivals and surface
   a compact "what's loading" strip. Feels faster; reads as content, not decor.
2. **Cheaper globe draw** — collapse thousands of per-frame `ctx.fillStyle`
   reassignments into a handful via alpha bucketing, freeing main-thread time
   during the exact window the WebGL scene compiles.
3. **Polish** — tighten the easing/hierarchy where the honest ring and strip
   land so the 100%→converge handoff feels earned.

## Signals we already have (no new pub/sub)

- Each of the 9 `LIVE_FEEDS` calls `emitLiveUpdate('data')` on success
  (`sources.ts`). Failures only `.catch` + warn — they never advance a counter.
- Every feed already carries `source` / `city` / `item` (commented "as displayed
  on the loading screen") but the current loader renders none of them — only
  `code`, for globe station labels. Latent, unused intent we now realize.
- `onLiveUpdate` is consumed by `CarouselItem`/`CardCanvas` for texture redraws.
  We do **not** touch it, so those consumers are unaffected.

## 1. Honest progress + feed strip

### Data layer (`sources.ts`) — additive

- Export an index-aligned feed-state array:
  ```ts
  export type FeedState = 'pending' | 'ok' | 'failed';
  export const feedStates: FeedState[] = LIVE_FEEDS.map(() => 'pending');
  export function feedsSettled(): number {
    return feedStates.reduce((n, s) => n + (s === 'pending' ? 0 : 1), 0);
  }
  ```
- In `loadLiveData`'s `forEach`, record the outcome so a failed feed still
  advances the "settled" count (progress must never stall on a dead source):
  ```ts
  LIVE_FEEDS.forEach((feed, i) => {
    feed.load()
      .then(() => { feedStates[i] = 'ok'; emitLiveUpdate('data'); })
      .catch((err) => { feedStates[i] = 'failed'; console.warn(...); });
  });
  ```
  `emitLiveUpdate('data')` stays **success-only** — dashboards keep redrawing on
  real data only, no spurious redraws from failures.

This mutable-array-beside-`live` pattern matches the existing mutable `live`
store convention (CLAUDE.md), so it is consistent, not a new paradigm.

### Loader — honest `pct` blend

The loader keeps its existing `pct` rAF loop (runs in reduced-motion too) and
reads `feedStates` there each frame — **no subscription needed**, the array is a
plain mutable read. This also covers the returning-visitor case where localStorage
-cached feeds resolve before the loader mounts (the count is read live, not from a
missed event).

Pure, unit-tested helper drives the target:
```ts
// loaderMath.ts
export function progressTarget(timeEased: number, settledFrac: number, done: boolean): number {
  if (done) return 100;
  // time baseline carries motion even if every feed fails; feeds add the surge
  return Math.min(96, timeEased * 0.72 + settledFrac * 24);
}
```
- `timeEased`: the existing eased climb, now aimed at ~100 (so `timeEased*0.72`
  ≈ up to 72 as the baseline). Provides motion when feeds stall.
- `settledFrac = feedsSettled() / LIVE_FEEDS.length` → up to +24.
- Cached-fast visitor: ring surges honestly. All-feeds-fail: still climbs to ~72
  on time, then snaps to 100 on `done`. Never stuck.

### Feed strip UI

A restrained telemetry element — **not** a second focal point:
- Desktop: a compact list/grid of rows, one per feed, mono, low opacity,
  bottom-anchored below the wordmark column. Each row: status glyph +
  `SOURCE` (tracked mono) + translated `item`. Glyph: `pending` = soft pulsing
  dot, `ok` = filled/check, `failed` = dim dash.
- Mobile: keep the existing `PctReadout`; augment it to `"{pct} % · {settled}/9"`.
  No full strip on phones (avoids clutter; mobile is already tuned).
- Reduced-motion: static list, no pulse; glyphs still reflect state.
- i18n: `item` labels are German; render them through `t()` and add the 9 keys
  to `en/fr/it`. `source`/`city` are proper nouns — left as-is (add to
  `identical.ts` only if a guard flags them; the loader is DOM, outside the
  card-canvas coverage recorder, so no guard fires, but we translate `item`
  anyway for a correct non-German experience).

## 2. Cheaper globe draw (alpha bucketing)

The cost is not the ~2600 `fillRect`s — it is reassigning `ctx.fillStyle` to a
freshly built `rgba(...)` string ~3700×/frame while the scene compiles.

- Quantize each dot's computed alpha into a small fixed set of buckets
  (start B = 6). Group rects by bucket, set `fillStyle` **once per bucket**, then
  fill that bucket's rects. Sphere dots, graticule, and arc packets each get
  their own color+bucket pass. Stations (~9) stay as-is — negligible.
- Pre-allocate the bucket arrays **outside** the draw loop; clear with
  `length = 0` per frame to avoid per-frame GC.
- Pure, unit-tested mapping helper:
  ```ts
  export function alphaBucket(alpha: number, buckets: number): number {
    return Math.min(buckets - 1, Math.max(0, Math.round(alpha * (buckets - 1))));
  }
  ```
- `N` (2600) and the DPR cap stay as they are; only trim them if profiling shows
  bucketing alone is not enough. Any reduction gets a code comment, not a silent
  change.

Net effect: identical look, thousands of style assignments → ~18/frame.

## 3. Polish

- Smooth the `pct`→100 approach so the ring completes just as the converge
  begins, instead of snapping.
- Feed strip fades/pulses in step with the existing `$done` collapse (same
  duration/ease as `Column`/`RingWrap`), so the exit stays one motion.

## File organization

`LoadingScreen.tsx` is at 767/800 lines and will exceed the cap with the strip +
bucketing. Targeted extraction into a `loading/` feature folder (matches the web
style guide's feature-folder convention), via `git mv` to preserve history:

```
src/components/loading/
  LoadingScreen.tsx     # orchestration, styled components, JSX
  useLoaderGlobe.ts     # the canvas globe effect (now batched)
  FeedStrip.tsx         # feed-status strip (presentational)
  loaderMath.ts         # pure: toVec, slerp, alphaBucket, progressTarget
  loaderMath.test.ts    # unit tests for the pure helpers
```

`App.tsx` import updates from `./components/LoadingScreen` to
`./components/loading/LoadingScreen` (one line).

## Error handling

- Feed failure → `feedStates[i] = 'failed'`, strip shows the failed glyph,
  progress completes anyway (time baseline + `done` snap). No throw, no stall.
- Reduced motion → no globe/pulse; honest `pct` and static strip still work
  (the `pct` loop is independent of the globe effect); existing 420ms exit timer
  unchanged.
- No SSR (Vite SPA, client-only).

## Testing

- **Unit (vitest):** `loaderMath.test.ts` covers `progressTarget`
  (done→100; all-fail→time-only ≤72; cached-fast→surge; cap at 96) and
  `alphaBucket` (clamping, endpoints, monotonic mapping). These are the pieces
  with real branching; extracting them makes them testable and keeps units small.
- **Visual:** run `npm run dev`, screenshot the loader mid-load (feeds pending)
  and near-done at 320 / 768 / 1024 / 1440 via the browser tool. The loader is
  always dark — no theme matrix.
- **Gates:** `npm run lint` (oxlint) and `npm run build` (tsc -b) must pass; the
  i18n coverage test (`npm run test`) must stay green after adding the `item`
  keys.
- Honest note: the canvas draw loop itself is not unit-covered; visual
  regression supplements it, per the project's testing guidance.

## Out of scope

- The 2.4s boot beat and exit choreography (converge/iris/flash/shockwave).
- Any change to `App.tsx` beyond the import path.
- Mobile typography/positioning (already shipped).