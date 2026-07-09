import { describe, it, expect } from 'vitest';
import {
  norm,
  niceScale,
  logScale,
  resample,
  yearly,
  interpAt,
  trend,
} from './series';

const id = (v: number): string => String(v);

describe('norm', () => {
  it('maps a series onto 0..1 against the given range', () => {
    expect(norm([0, 5, 10], 0, 10)).toEqual([0, 0.5, 1]);
  });

  it('does not divide by zero when lo === hi', () => {
    const out = norm([5, 5], 5, 5);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});

describe('niceScale', () => {
  it('snaps 0..100 to a round step with one tick per gridline', () => {
    const { lo, hi, ticks } = niceScale(0, 100, id);
    expect(lo).toBe(0);
    expect(hi).toBe(100);
    // step 25 → 0/25/50/75/100
    expect(ticks).toEqual(['0', '25', '50', '75', '100']);
  });

  it('keeps lo at or below min and hi at or above max', () => {
    const { lo, hi } = niceScale(3, 47, id);
    expect(lo).toBeLessThanOrEqual(3);
    expect(hi).toBeGreaterThanOrEqual(47);
  });

  it('allows a negative floor when the data goes below zero', () => {
    const { lo } = niceScale(-12, 30, id);
    expect(lo).toBeLessThan(0);
  });
});

describe('logScale', () => {
  it('snaps bounds to powers of the base with a label per gridline', () => {
    const { lo, hi, ticks } = logScale(1, 19, id, 2);
    expect(lo).toBe(1);
    expect(hi).toBe(32);
    expect(ticks).toEqual(['1', '2', '4', '8', '16', '32']);
  });
});

describe('resample', () => {
  it('downsamples while keeping the first and last point', () => {
    const out = resample([1, 2, 3, 4, 5], 3);
    expect(out).toHaveLength(3);
    expect(out[0]).toBe(1);
    expect(out[out.length - 1]).toBe(5);
  });

  it('returns the series untouched when it is already short enough', () => {
    expect(resample([1, 2], 5)).toEqual([1, 2]);
  });
});

describe('yearly', () => {
  it('linearly interpolates sparse year anchors into a dense yearly series', () => {
    expect(yearly([[2000, 0], [2002, 10]])).toEqual([0, 5, 10]);
  });

  it('sorts anchors before interpolating', () => {
    expect(yearly([[2002, 10], [2000, 0]])).toEqual([0, 5, 10]);
  });
});

describe('interpAt', () => {
  const pts: [number, number][] = [[0, 0], [10, 100]];

  it('interpolates between the surrounding points', () => {
    expect(interpAt(pts, 5)).toBe(50);
  });

  it('clamps below the first and above the last point', () => {
    expect(interpAt(pts, -5)).toBe(0);
    expect(interpAt(pts, 999)).toBe(100);
  });
});

describe('trend', () => {
  it('normalizes the series and reports the true latest value', () => {
    // 40 years so the default 28-sample downsample actually runs.
    const pts: [number, number][] = [[1980, 10], [2020, 50]];
    const out = trend(pts, id, ['1980', '2020']);
    expect(out.latest).toBe(50);
    expect(out.series.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(out.ticks.length).toBeGreaterThan(1);
  });

  it('computes year-over-year percent from the last two raw values', () => {
    const pts: [number, number][] = [[2018, 100], [2019, 100], [2020, 110]];
    const out = trend(pts, id, []);
    expect(out.yoyPct).toBeCloseTo(10, 6);
  });
});
