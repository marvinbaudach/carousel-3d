import { describe, expect, it } from 'vitest';
import { alphaBucket, progressTarget, slerp, toVec } from './loaderMath';

describe('progressTarget', () => {
  it('reports 100 the moment the boot is done, regardless of feeds or time', () => {
    expect(progressTarget(0, 0, true)).toBe(100);
    expect(progressTarget(50, 0.3, true)).toBe(100);
  });

  it('starts at zero and rises only with the time baseline and feeds', () => {
    expect(progressTarget(0, 0, false)).toBe(0);
  });

  it('climbs to ~72 on time alone when every feed fails, never stalling', () => {
    // time baseline maxes at 100 * 0.72; no feeds settled
    expect(progressTarget(100, 0, false)).toBeCloseTo(72, 5);
  });

  it('lets real feed arrivals surge the target above the time baseline', () => {
    // half the feeds settled adds 0.5 * 24 = 12 on top of the 72 baseline
    expect(progressTarget(100, 0.5, false)).toBeCloseTo(84, 5);
  });

  it('caps below 100 while not done so the ring never pre-empts the converge', () => {
    // 72 + 24 = 96 exactly, and anything beyond stays clamped
    expect(progressTarget(100, 1, false)).toBeCloseTo(96, 5);
    expect(progressTarget(200, 2, false)).toBe(96);
  });
});

describe('alphaBucket', () => {
  it('maps the low and high ends to the first and last bucket', () => {
    expect(alphaBucket(0, 6)).toBe(0);
    expect(alphaBucket(1, 6)).toBe(5);
  });

  it('clamps out-of-range alpha into the valid bucket span', () => {
    expect(alphaBucket(-0.5, 6)).toBe(0);
    expect(alphaBucket(1.5, 6)).toBe(5);
  });

  it('is monotonic across the alpha range', () => {
    expect(alphaBucket(0.2, 6)).toBeLessThanOrEqual(alphaBucket(0.8, 6));
  });
});

describe('toVec / slerp', () => {
  it('places lat0/lon0 on the +Z pole of the unit sphere', () => {
    const [x, y, z] = toVec(0, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(1, 6);
  });

  it('returns the endpoints at t=0 and t=1', () => {
    const a = toVec(10, 20);
    const b = toVec(-30, 140);
    const at0 = slerp(a, b, 0);
    const at1 = slerp(a, b, 1);
    at0.forEach((v, i) => expect(v).toBeCloseTo(a[i], 5));
    at1.forEach((v, i) => expect(v).toBeCloseTo(b[i], 5));
  });

  it('returns the same vector when both ends coincide', () => {
    const a = toVec(47.4, 8.5);
    expect(slerp(a, a, 0.5)).toEqual(a);
  });
});
