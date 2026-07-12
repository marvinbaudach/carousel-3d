import { describe, it, expect } from 'vitest';
import { divergingBarChart, divergingX, type DivergingBarCfg } from './bar';
import { SETTLED_T } from '../types';
import type { Frame } from '../draw';
import { createFakeContext } from '../../test/fakeCanvas';
import { CRITICAL, GOOD, SERIES } from '../theme';

function frameAt(t: number, h = 640): Frame & { ctx: ReturnType<typeof createFakeContext> } {
  const w = 512;
  return { ctx: createFakeContext(w, h), w, h, t, u: w / 512 };
}

describe('divergingX', () => {
  it('maps min, zero and max onto the axis linearly', () => {
    expect(divergingX(-40, -40, 40, 100, 500)).toBe(100);
    expect(divergingX(0, -40, 40, 100, 500)).toBe(300);
    expect(divergingX(40, -40, 40, 100, 500)).toBe(500);
    expect(divergingX(20, -40, 40, 100, 500)).toBe(400);
  });

  it('clamps values outside the bounds instead of overshooting the plot', () => {
    expect(divergingX(-100, -40, 40, 100, 500)).toBe(100);
    expect(divergingX(999, -40, 40, 100, 500)).toBe(500);
  });

  it('keeps the sign geometry: negative values land left of zero', () => {
    const zero = divergingX(0, -40, 40, 100, 500);
    expect(divergingX(-19, -40, 40, 100, 500)).toBeLessThan(zero);
    expect(divergingX(18, -40, 40, 100, 500)).toBeGreaterThan(zero);
  });
});

const CFG: DivergingBarCfg = {
  label: 'Zeitersparnis mit KI · erwartet vs. gemessen',
  value: -19,
  delta: null,
  rowFmt: (v) => `${v > 0 ? '+' : ''}${Math.round(v)} %`,
  min: -45,
  max: 45,
  zeroLabel: '0 % = keine Wirkung',
  rows: [
    { name: 'Prognose vorher', v: 24, color: SERIES[0] },
    { name: 'Messung 2025', v: -19, lo: -39, hi: -2, color: CRITICAL, sub: '16 Devs' },
    { name: 'Alt-Kohorte Ende 2025', v: 18, lo: -9, hi: 38, color: GOOD },
  ],
};

describe('divergingBarChart', () => {
  it('draws intro and settled frames without throwing, and paints something', () => {
    for (const t of [0, SETTLED_T]) {
      const f = frameAt(t);
      expect(() => divergingBarChart(f, CFG)).not.toThrow();
      expect(f.ctx.calls.length).toBeGreaterThan(0);
    }
  });

  it('renders whiskers only for rows that publish an interval', () => {
    const f = frameAt(SETTLED_T);
    divergingBarChart(f, CFG);
    // Two whiskered rows → the settled frame strokes more paths than a
    // whisker-free variant of the same config.
    const bare = frameAt(SETTLED_T);
    divergingBarChart(bare, {
      ...CFG,
      rows: CFG.rows.map(({ lo: _lo, hi: _hi, ...r }) => r),
    });
    const strokes = (ctx: ReturnType<typeof createFakeContext>) =>
      ctx.calls.filter((c) => c === 'stroke').length;
    expect(strokes(f.ctx)).toBeGreaterThan(strokes(bare.ctx));
  });
});
