// Reusable series math shared by the fetchers and the bundled datasets:
// normalization, nice axis scales, resampling and interpolation of sparse
// year->value anchors into the draw-ready shapes the charts expect.

import type { TrendSeries } from './store';

/** Normalize a series into 0..1 against a (lo, hi) range. */
export function norm(series: number[], lo: number, hi: number): number[] {
  const span = Math.max(1e-9, hi - lo);
  return series.map((v) => (v - lo) / span);
}

/**
 * Nice axis: bounds snapped to a round step (1/2/2.5/5 x 10^k) and a label
 * for every gridline, so the y-axis reads 0/2/4/6... instead of 0.1/4.9/9.8.
 */
export function niceScale(
  min: number,
  max: number,
  fmt: (v: number) => string,
): { lo: number; hi: number; ticks: string[] } {
  const span = Math.max(1e-9, max - min);
  const mag = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 4.5) ?? 10 * mag;
  const lo = min >= 0 ? Math.max(0, Math.floor(min / step) * step) : Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const n = Math.round((hi - lo) / step);
  return {
    lo,
    hi,
    ticks: Array.from({ length: n + 1 }, (_, i) => fmt(lo + i * step)),
  };
}

/** Evenly resample a series down to n points (keeps first and last). */
export function resample(series: number[], n: number): number[] {
  if (series.length <= n) return series;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(series[Math.round((i * (series.length - 1)) / (n - 1))]);
  }
  return out;
}

/** Interpolate a sparse year->value map into an even yearly series. */
export function yearly(points: [number, number][]): number[] {
  const sorted = points.toSorted((a, b) => a[0] - b[0]);
  const out: number[] = [];
  for (let y = sorted[0][0]; y <= sorted[sorted.length - 1][0]; y++) {
    const nextI = sorted.findIndex(([py]) => py >= y);
    const [y1, v1] = sorted[Math.max(0, nextI - 1)];
    const [y2, v2] = sorted[nextI];
    out.push(y1 === y2 ? v1 : v1 + ((v2 - v1) * (y - y1)) / (y2 - y1));
  }
  return out;
}

/** Linear-interpolate sorted [x, y] points at x (clamped at the ends). */
export function interpAt(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x2, y2] = points[i];
    if (x2 >= x) {
      const [x1, y1] = points[i - 1];
      return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
    }
  }
  return last[1];
}

/** Build a single-series trend panel from sparse year->value anchors. */
export function trend(
  points: [number, number][],
  fmt: (v: number) => string,
  xLabels: string[],
  // Long spans with sharp single-year spikes (world wars) need a finer
  // sampling or the peaks get skipped between samples.
  samples = 28,
): TrendSeries {
  const series = yearly(points);
  const s = niceScale(Math.min(...series), Math.max(...series), fmt);
  return {
    series: norm(resample(series, samples), s.lo, s.hi),
    ticks: s.ticks,
    latest: series[series.length - 1],
    yoyPct: ((series[series.length - 1] - series[series.length - 2]) / series[series.length - 2]) * 100,
    xLabels,
  };
}

/** One labeled anchor set for a multi-series comparison chart. */
export interface CompareAnchors {
  name: string;
  pts: [number, number][];
}

/**
 * Build a multi-series comparison from several anchor sets: every series is
 * interpolated to yearly points and normalized onto one shared nice scale,
 * so the lines stay directly comparable. `extra` (e.g. the headline latest
 * value) is merged into the result.
 */
export function compareSeries<E extends object>(
  anchors: CompareAnchors[],
  fmt: (v: number) => string,
  extra: E,
  samples = 48,
): { rows: { name: string; data: number[] }[]; ticks: string[] } & E {
  const yearlySets = anchors.map((c) => yearly(c.pts));
  const all = yearlySets.flat();
  const s = niceScale(Math.min(...all), Math.max(...all), fmt);
  return {
    rows: anchors.map((c, i) => ({
      name: c.name,
      data: norm(resample(yearlySets[i], samples), s.lo, s.hi),
    })),
    ticks: s.ticks,
    ...extra,
  };
}
