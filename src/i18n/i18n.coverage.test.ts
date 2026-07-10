import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EN } from './en';
import { FR } from './fr';
import { IT } from './it';
import { t as tr, setLocale, __setMissRecorder } from './index';
import { IDENTICAL_ACROSS_LOCALES } from './identical';
import { DASHBOARDS_BY_ID } from '../dashboards';
import { SETTLED_T } from '../dashboards/types';
import type { Frame } from '../dashboards/draw';
import { createFakeContext } from '../test/fakeCanvas';

// Coverage guard for the German→other-locale translations.
//
// The dictionaries are keyed by the exact German source string, and `t()`
// passes an unknown string through unchanged — a safety feature (a missing
// entry never blanks a panel) that also hides drift: reword or re-punctuate a
// card's German copy and the key silently stops matching, so a French visitor
// is served German with no error anywhere.
//
// This test closes that gap. It renders every card through the real draw path
// with a recorder attached to `t()`, capturing exactly the strings the choke
// points ask to translate (the run is in `en`, but that only decides what `t()`
// *returns* — the set of German source strings it is asked to translate is the
// same in every locale). Each string must then be a known dictionary key OR
// listed as locale-invariant.
//
// A string is "known" if it is a key in EN, FR *or* IT — not EN alone. EN only
// carries strings whose English rendering differs from the German; a string
// that reads the same in English but differently in French/Italian lives in
// FR/IT as an extra key and is legitimately absent from EN. Checking the union
// of all three key sets is what recognises those as covered.
//
// Two failure classes:
//   • DRIFT   — a rendered string is not a known key but normalises to one
//               (whitespace / case / dash / quote / typo edits). Almost
//               certainly a broken-loose translation; fix the key or the copy.
//   • MISSING — a rendered string has no key in any dictionary and no near
//               match. Either add a translation, or, if it truly reads the same
//               in every locale, list it in identical.ts. Never a silent pass.

interface Miss {
  source: string;
  segment: string;
}

const misses: Miss[] = [];

/** Contains at least one letter — pure numbers / punctuation / currency
    symbols (2025, "· 30", "€") are legitimately locale-invariant and exempt. */
const hasLetter = (s: string): boolean => /\p{L}/u.test(s);

/** Fold away the differences that cause silent drift: case, any run of
    whitespace (incl. NBSP), the various dash and typographic-quote glyphs, and
    the ellipsis. Two strings with the same normal form are "the same label"
    to a reader but distinct dictionary keys. */
function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-') // ‐‑‒–—―− → hyphen
    .replace(/[„“”«»‚‘’]/g, '"') // typographic quotes → straight
    .replace(/…/g, '...') // … → ...
    .replace(/\s+/g, ' ') // any whitespace run (incl. NBSP) → single space
    .trim();
}

// Every German source string any dictionary knows how to translate. The three
// dicts are all keyed by the same German source; a key present in FR/IT but not
// EN is an "English is identical" extra key — still a known, covered string.
const KNOWN: ReadonlySet<string> = new Set<string>([
  ...Object.keys(EN),
  ...Object.keys(FR),
  ...Object.keys(IT),
]);

// Normalised known key → the first original key with that form, for near-match
// (drift) detection.
const normToKey = new Map<string, string>();
for (const key of KNOWN) {
  const n = normalize(key);
  if (!normToKey.has(n)) normToKey.set(n, key);
}

beforeAll(() => {
  setLocale('en');
  __setMissRecorder((source, unresolved) => {
    for (const segment of unresolved) misses.push({ source, segment });
  });

  for (const card of Object.values(DASHBOARDS_BY_ID)) {
    // Intro (t=0) and settled (SETTLED_T) both, so time-gated labels — status
    // pills, reveal-gated rows — are exercised at each end of the animation.
    for (const time of [0, SETTLED_T]) {
      const ctx = createFakeContext(512, 640);
      const f: Frame = { ctx, w: 512, h: 640, t: time, u: 1 };
      try {
        card.draw(f);
      } catch {
        // Crash coverage is the smoke test's job; a throw here just means fewer
        // strings observed, never a false pass.
      }
    }
    // Declared metadata reaches the choke points in surfaces this render path
    // doesn't cover (deck list labels, the mobile info button, the PNG export
    // footer), so route them through explicitly too.
    tr(card.title);
    if (card.source) tr(card.source);
  }

  __setMissRecorder(null);
});

afterAll(() => {
  __setMissRecorder(null);
  setLocale('de');
});

describe('translation coverage guard', () => {
  it('observed a meaningful number of translatable strings', () => {
    // Guards the guard: if the render path or recorder silently stopped
    // producing misses, everything below would pass vacuously.
    expect(misses.length).toBeGreaterThan(20);
  });

  // Self-tests: prove the two detectors actually fire, so a green suite means
  // "nothing drifted / nothing uncovered", not "the check never triggers".
  it('self-test: the drift detector catches a re-punctuated key', () => {
    // A key that is the canonical owner of its normal form, so the round-trip
    // is unambiguous.
    const real = [...KNOWN].find((k) => hasLetter(k) && normToKey.get(normalize(k)) === k);
    expect(real).toBeTruthy();
    // A trailing space + swapped dash is a different string but the same label.
    const drifted = `${real} `.replace(/-/g, '–');
    expect(KNOWN.has(drifted)).toBe(false); // not an exact key…
    expect(normToKey.get(normalize(drifted))).toBe(real); // …but normalises back
  });

  it('self-test: an unknown German string counts as uncovered', () => {
    const fake = 'Frei erfundener deutscher Kartentitel §';
    expect(KNOWN.has(fake)).toBe(false);
    expect(IDENTICAL_ACROSS_LOCALES.has(fake)).toBe(false);
    expect(normToKey.get(normalize(fake))).toBeUndefined(); // no near match → MISSING
  });

  it('no card copy has drifted from an existing dictionary key', () => {
    const drift = new Map<string, { nearKey: string; source: string }>();
    for (const { segment, source } of misses) {
      if (!hasLetter(segment)) continue;
      if (KNOWN.has(segment)) continue; // exact key in some dictionary → fine
      const near = normToKey.get(normalize(segment));
      if (near && near !== segment) drift.set(segment, { nearKey: near, source });
    }
    const report = [...drift.entries()].map(
      ([segment, { nearKey }]) =>
        `rendered "${segment}" ≈ dictionary key "${nearKey}" — reconcile them so the key matches exactly`,
    );
    expect(report).toEqual([]);
  });

  it('every translatable string is covered by the dictionary or listed as identical', () => {
    const missing = new Map<string, Set<string>>();
    for (const { segment, source } of misses) {
      if (!hasLetter(segment)) continue;
      if (KNOWN.has(segment)) continue;
      if (IDENTICAL_ACROSS_LOCALES.has(segment)) continue;
      // Drift is reported by the test above; don't double-count near-matches.
      const near = normToKey.get(normalize(segment));
      if (near && near !== segment) continue;
      const sources = missing.get(segment) ?? new Set<string>();
      sources.add(source);
      missing.set(segment, sources);
    }
    const report = [...missing.keys()].toSorted();
    expect(report).toEqual([]);
  });
});
