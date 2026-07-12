import { describe, it, expect } from 'vitest';
import { METR_HORIZON_PANEL, logBandPanel, minutesFmt } from './bundled';

describe('logBandPanel', () => {
  const panel = logBandPanel(
    [
      [2020, 1, 0.5, 2],
      [2022, 100, 50, 200],
    ],
    0,
    3,
    1,
    (v) => String(v),
    ['2020', '2022'],
  );

  it('keeps series and band index-aligned', () => {
    expect(panel.band.lo.length).toBe(panel.series.length);
    expect(panel.band.hi.length).toBe(panel.series.length);
  });

  it('brackets the estimate between the CI bounds at every sample', () => {
    panel.series.forEach((v, i) => {
      expect(panel.band.lo[i]).toBeLessThanOrEqual(v);
      expect(panel.band.hi[i]).toBeGreaterThanOrEqual(v);
    });
  });

  it('normalises log10 values against the decade window', () => {
    // First anchor: 1 → log10 = 0 → bottom of the [0, 3] window.
    expect(panel.series[0]).toBeCloseTo(0, 5);
    // Last anchor: 100 → log10 = 2 → two thirds up.
    expect(panel.series[panel.series.length - 1]).toBeCloseTo(2 / 3, 5);
    expect(panel.latest).toBe(100);
  });

  it('labels one tick per stepDec decades', () => {
    expect(panel.ticks).toEqual(['1', '10', '100', '1000']);
  });
});

describe('METR_HORIZON_PANEL', () => {
  it('stays inside the drawable window, band included', () => {
    for (const arr of [METR_HORIZON_PANEL.series, METR_HORIZON_PANEL.band.lo, METR_HORIZON_PANEL.band.hi]) {
      for (const v of arr) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('headline is the real Opus 4.6 measurement (~12 h), not a projection', () => {
    expect(METR_HORIZON_PANEL.latest).toBe(719);
  });
});

describe('minutesFmt', () => {
  it('picks the unit by magnitude', () => {
    expect(minutesFmt(0.05)).toMatch(/3\s?/); // 3 Sek
    expect(minutesFmt(5)).toContain('5');
    expect(minutesFmt(719)).toContain('12'); // 12 Std
    expect(minutesFmt(10000)).toContain('7'); // 7 Tage
  });
});
