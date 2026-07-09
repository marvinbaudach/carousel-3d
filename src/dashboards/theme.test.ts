import { describe, it, expect } from 'vitest';
import { SERIES, SEQ, GOOD, CRITICAL } from './theme';

const HEX = /^#[0-9a-f]{6}$/;

describe('theme palette', () => {
  it('exposes eight distinct categorical series slots', () => {
    expect(SERIES).toHaveLength(8);
    expect(new Set(SERIES).size).toBe(SERIES.length);
  });

  it('exposes an eight-stop sequential ramp', () => {
    expect(SEQ).toHaveLength(8);
    expect(new Set(SEQ).size).toBe(SEQ.length);
  });

  it('uses only well-formed lowercase hex', () => {
    for (const c of [...SERIES, ...SEQ, GOOD, CRITICAL]) {
      expect(c).toMatch(HEX);
    }
  });

  it('keeps the reserved status colors out of the categorical palette', () => {
    // The convention: GOOD/CRITICAL never double as a series color, so a chart
    // can never accidentally paint a data category in a status hue.
    expect(SERIES).not.toContain(GOOD);
    expect(SERIES).not.toContain(CRITICAL);
  });
});
