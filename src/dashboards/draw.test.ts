import { describe, it, expect, beforeAll } from 'vitest';
import { makeSeries, easeOut, stagger, fmtCompact } from './draw';
import { setLocale } from '../i18n';

describe('makeSeries', () => {
  it('is deterministic — the same seed yields the same series', () => {
    expect(makeSeries(42, 50)).toEqual(makeSeries(42, 50));
  });

  it('produces different data for different seeds', () => {
    expect(makeSeries(1, 50)).not.toEqual(makeSeries(2, 50));
  });

  it('returns exactly n points', () => {
    expect(makeSeries(7, 24)).toHaveLength(24);
  });

  it('stays inside the clamped 0.08..0.95 band', () => {
    for (const seed of [0, 1, 99, 12345]) {
      for (const v of makeSeries(seed, 200)) {
        expect(v).toBeGreaterThanOrEqual(0.08);
        expect(v).toBeLessThanOrEqual(0.95);
      }
    }
  });
});

describe('easeOut', () => {
  it('pins the endpoints', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });

  it('clamps out-of-range input', () => {
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });

  it('is monotonically increasing across the unit interval', () => {
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const y = easeOut(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});

describe('stagger', () => {
  it('has not started for an item whose delay has not elapsed', () => {
    expect(stagger(0, 5)).toBe(0);
  });

  it('is fully in once well past the item start', () => {
    expect(stagger(10, 0)).toBe(1);
  });

  it('starts later items later', () => {
    expect(stagger(0.2, 0)).toBeGreaterThan(stagger(0.2, 3));
  });
});

describe('fmtCompact', () => {
  // Force German so the magnitude words pass through untranslated and the
  // decimal separator is stable regardless of the test runner's locale.
  beforeAll(() => setLocale('de'));

  it('formats trillions/billions/millions with the German magnitude word', () => {
    expect(fmtCompact(1.5e12)).toBe('1,50 Bio.');
    expect(fmtCompact(2.3e9)).toBe('2,3 Mrd');
    expect(fmtCompact(4.5e6)).toBe('4,5 Mio');
  });

  it('uses a k suffix across the thousands band', () => {
    expect(fmtCompact(15000)).toBe('15k');
    expect(fmtCompact(1500)).toBe('1,5k');
  });

  it('prints small values verbatim and honours the unit prefix', () => {
    expect(fmtCompact(500)).toBe('500');
    expect(fmtCompact(500, '$')).toBe('$500');
  });
});
