import { describe, it, expect } from 'vitest';
import {
  t,
  setLocale,
  localeInt,
  localeNum,
  localePct,
  localeNumTrim,
  localePctTrim,
} from './index';
import { EN } from './en';
import { FR } from './fr';
import { IT } from './it';

// A real German→English pair with no ' · ' separator, taken from the source
// dictionary so the test never hardcodes a translation that might be reworded.
const [SIMPLE_KEY, SIMPLE_VAL] = Object.entries(EN).find(([k]) => !k.includes(' · ')) ?? ['', ''];

describe('t()', () => {
  it('returns the source string unchanged in German', () => {
    setLocale('de');
    expect(t(SIMPLE_KEY)).toBe(SIMPLE_KEY);
  });

  it('translates a known string in a non-German locale', () => {
    setLocale('en');
    expect(t(SIMPLE_KEY)).toBe(SIMPLE_VAL);
  });

  it('passes an unknown string through untouched (never blanks a panel)', () => {
    setLocale('en');
    expect(t('§ totally unknown string §')).toBe('§ totally unknown string §');
  });

  it('translates the static segments of a composed A · B label', () => {
    setLocale('en');
    // The dynamic tail (a year) has no dict entry and must survive verbatim.
    expect(t(`${SIMPLE_KEY} · 2099`)).toBe(`${SIMPLE_VAL} · 2099`);
  });

  it('leaves a composed label untouched when no segment is known', () => {
    setLocale('en');
    expect(t('§foo§ · §bar§')).toBe('§foo§ · §bar§');
  });
});

describe('locale number formatters', () => {
  it('groups thousands per locale', () => {
    setLocale('de');
    expect(localeInt(12183)).toBe('12.183');
    setLocale('en');
    expect(localeInt(12183)).toBe('12,183');
  });

  it('rounds to an integer before grouping', () => {
    setLocale('de');
    expect(localeInt(12183.7)).toBe('12.184');
  });

  it('applies fixed decimals with the locale separator', () => {
    setLocale('de');
    expect(localeNum(1.5, 2)).toBe('1,50');
    setLocale('en');
    expect(localeNum(1.5, 2)).toBe('1.50');
  });

  it('adds a no-break space before % for de/fr but not en', () => {
    setLocale('de');
    expect(localePct(13.4, 1)).toBe('13,4 %');
    setLocale('en');
    expect(localePct(13.4, 1)).toBe('13.4%');
  });

  it('trims a redundant trailing-zero decimal but keeps real ones', () => {
    setLocale('de');
    expect(localeNumTrim(84)).toBe('84');
    expect(localeNumTrim(84.7)).toBe('84,7');
    expect(localeNumTrim(5.63)).toBe('5,6');
  });

  it('trims the percent form the same way', () => {
    setLocale('de');
    expect(localePctTrim(34)).toBe('34 %');
    setLocale('en');
    expect(localePctTrim(34)).toBe('34%');
  });
});

describe('dictionary sanity', () => {
  it.each([
    ['EN', EN],
    ['FR', FR],
    ['IT', IT],
  ])('%s has no empty keys or values', (_name, dict) => {
    for (const [key, value] of Object.entries(dict)) {
      expect(key.length).toBeGreaterThan(0);
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
