// Pure geometry + progress math for the loading screen. Kept free of React and
// canvas so the branching bits stay unit-testable and the component file small.

export type Vec3 = [number, number, number];

/** lat/lon (degrees) -> point on the unit sphere. */
export function toVec(lat: number, lon: number): Vec3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

/** Spherical interpolation between two unit vectors. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const th = Math.acos(dot);
  if (th < 1e-4) return a;
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
}

// Progress model. The ring used to lie (ease to 92, snap to 100 on a timer).
// Now it blends an honest time baseline with real feed arrivals: the baseline
// alone guarantees motion even if every source fails, and settled feeds surge
// the target above it. Kept below 100 until `done` so the arc never pre-empts
// the converge handoff.
const TIME_WEIGHT = 0.72; // time baseline contributes up to ~72
const FEED_WEIGHT = 24; // all feeds settled adds up to +24
const PRE_DONE_CAP = 96; // ceiling while still booting

/**
 * @param timeEased 0..100 time-only baseline (eases toward 100 on its own)
 * @param settledFrac 0..1 fraction of live feeds that have settled (ok or failed)
 * @param done true once the boot beat + dictionary are ready
 */
export function progressTarget(
  timeEased: number,
  settledFrac: number,
  done: boolean,
): number {
  if (done) return 100;
  return Math.min(PRE_DONE_CAP, timeEased * TIME_WEIGHT + settledFrac * FEED_WEIGHT);
}

/**
 * Quantize an alpha (0..1) into one of `buckets` bins. Grouping the globe's
 * thousands of dots by bucket lets the draw loop set `ctx.fillStyle` once per
 * bin instead of once per dot — the real per-frame cost.
 */
export function alphaBucket(alpha: number, buckets: number): number {
  return Math.min(buckets - 1, Math.max(0, Math.round(alpha * (buckets - 1))));
}
