// Climate datasets: per-country anchor points for the live world-temperature
// map (derived from the bundled outlines, so no extra geometry ships), a
// crude latitude/season climatology as its offline fallback, and the bundled
// 10,000-year global temperature reconstruction.

import { localeNum } from '../i18n';
import { interpAt, niceScale, norm, trend } from './series';
import { WORLD } from './world';

// ---------------------------------------------------------------------------
// Per-country temperature anchors: one representative point per country, the
// bounding-box centre of its largest outline ring. Good enough for a weather
// reading — Open-Meteo's model grid covers every land cell, and a centre that
// drifts into a neighbour or the sea still samples the same climate zone.

export interface TempAnchor {
  iso: string;
  lon: number;
  lat: number;
}

function anchorOf(rings: number[][][]): { lon: number; lat: number } {
  let best = rings[0];
  let bestArea = -1;
  for (const ring of rings) {
    let lonMin = 180, lonMax = -180, latMin = 90, latMax = -90;
    for (const [lon, lat] of ring) {
      lonMin = Math.min(lonMin, lon);
      lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat);
      latMax = Math.max(latMax, lat);
    }
    const area = (lonMax - lonMin) * (latMax - latMin);
    if (area > bestArea) {
      bestArea = area;
      best = ring;
    }
  }
  let lonMin = 180, lonMax = -180, latMin = 90, latMax = -90;
  for (const [lon, lat] of best) {
    lonMin = Math.min(lonMin, lon);
    lonMax = Math.max(lonMax, lon);
    latMin = Math.min(latMin, lat);
    latMax = Math.max(latMax, lat);
  }
  return { lon: (lonMin + lonMax) / 2, lat: (latMin + latMax) / 2 };
}

export const TEMP_ANCHORS: TempAnchor[] = WORLD
  // Antarctica sits below the map crop (60°S) — no point fetching it.
  .filter((c) => c.id !== 'ATA')
  .map((c) => {
    const { lon, lat } = anchorOf(c.rings);
    return { iso: c.id, lon, lat };
  });

// ---------------------------------------------------------------------------
// Offline fallback: a latitude/season climatology. Deliberately crude (no
// continentality, no altitude) — it only keeps the map plausible until the
// Open-Meteo reading lands, and the card labels it as an approximation.

const NOW_MONTH = new Date().getMonth();

/** Rough expected 2-m temperature (°C) at a latitude for a month (0-based). */
export function climatologyTemp(lat: number, month = NOW_MONTH): number {
  const abs = Math.abs(lat);
  const annualMean = 27 - 0.55 * abs;
  const amplitude = 0.32 * abs;
  // +1 around July in the north, inverted for the southern hemisphere.
  const season = Math.cos((2 * Math.PI * (month - 6.5)) / 12);
  return annualMean + amplitude * season * (lat >= 0 ? 1 : -1);
}

export const FALLBACK_TEMPS: Record<string, number> = Object.fromEntries(
  TEMP_ANCHORS.map((a) => [a.iso, climatologyTemp(a.lat)]),
);

// German display names for the ranked "hottest now" list — a hot-belt subset
// (both hemispheres) so the ranking never surfaces an ISO code without a name.
const TEMP_NAME_BY_ISO: Record<string, string> = {
  KWT: 'Kuwait', IRQ: 'Irak', SAU: 'Saudi-Arabien', ARE: 'VAE', IRN: 'Iran',
  PAK: 'Pakistan', IND: 'Indien', EGY: 'Ägypten', DZA: 'Algerien',
  LBY: 'Libyen', MLI: 'Mali', NER: 'Niger', TCD: 'Tschad', SDN: 'Sudan',
  NGA: 'Nigeria', MEX: 'Mexiko', USA: 'USA', ESP: 'Spanien',
  GRC: 'Griechenland', ITA: 'Italien', TUR: 'Türkei', BRA: 'Brasilien',
  VEN: 'Venezuela', AUS: 'Australien', IDN: 'Indonesien',
};

/** Top-4 hottest countries (from the named subset) for the ranked list. */
export function hottestRows(byIso: Record<string, number>): { name: string; v: number }[] {
  return Object.entries(TEMP_NAME_BY_ISO)
    .filter(([iso]) => byIso[iso] !== undefined)
    .map(([iso, name]) => ({ name, v: byIso[iso] }))
    .toSorted((a, b) => b.v - a.v)
    .slice(0, 4);
}

export const FALLBACK_TEMP_ROWS = hottestRows(FALLBACK_TEMPS);

// ---------------------------------------------------------------------------
// Global mean temperature over the last 10,000 years: simplified anchors along
// the Kaufman et al. 2020 (Temp12k) multi-method median, switching to the
// instrumental record (HadCRUT5) from 1850. Anomalies vs. the 1800–1900 mean.
// The half-width approximates the 90% ensemble range — wide in the proxy era,
// narrow once thermometers take over. Two honest caveats the card repeats:
// proxies average over ~100–200 years (a spike as short as the current one
// would be smoothed), and the mid-Holocene warmth is strongest in northern
// summers — the global median shown here is flatter than regional records.

// [calendar year (negative = BC), median °C, half-width of the 90% range]
const HOLOCENE_ANCHORS: [number, number, number][] = [
  [-8000, 0.05, 0.45],
  [-7000, 0.25, 0.4],
  [-6000, 0.35, 0.4],
  [-5000, 0.42, 0.35],
  [-4500, 0.45, 0.35], // mid-Holocene optimum (global median)
  [-3500, 0.4, 0.35],
  [-2500, 0.3, 0.3],
  [-1500, 0.25, 0.3],
  [-500, 0.2, 0.25],
  [0, 0.15, 0.25],
  [500, 0.1, 0.22],
  [1000, 0.1, 0.2], // medieval warm period barely moves the global median
  [1450, -0.05, 0.18],
  [1700, -0.15, 0.15], // Little Ice Age
  [1820, -0.1, 0.12],
  [1850, 0.0, 0.06], // instrumental record starts
  [1900, 0.05, 0.05],
  [1940, 0.25, 0.05],
  [1970, 0.25, 0.04],
  [1990, 0.55, 0.03],
  [2005, 0.85, 0.03],
  [2015, 1.1, 0.03],
  [2024, 1.5, 0.05], // HadCRUT5, warmest year on record
];

const HOLOCENE_START = -8000;
const HOLOCENE_END = 2025;

function holocenePanel() {
  const med = HOLOCENE_ANCHORS.map(([y, m]) => [y, m] as [number, number]);
  const loPts = HOLOCENE_ANCHORS.map(([y, m, w]) => [y, m - w] as [number, number]);
  const hiPts = HOLOCENE_ANCHORS.map(([y, m, w]) => [y, m + w] as [number, number]);

  const n = 240;
  const median: number[] = [];
  const lo: number[] = [];
  const hi: number[] = [];
  for (let i = 0; i < n; i++) {
    const year = HOLOCENE_START + ((HOLOCENE_END - HOLOCENE_START) * i) / (n - 1);
    median.push(interpAt(med, year));
    lo.push(interpAt(loPts, year));
    hi.push(interpAt(hiPts, year));
  }
  const s = niceScale(
    Math.min(...lo) - 0.05,
    Math.max(...hi) + 0.05,
    (v) => `${v > 0 ? '+' : ''}${localeNum(v, 1)}°`,
  );
  return {
    median: norm(median, s.lo, s.hi),
    lo: norm(lo, s.lo, s.hi),
    hi: norm(hi, s.lo, s.hi),
    ticks: s.ticks,
    latest: HOLOCENE_ANCHORS[HOLOCENE_ANCHORS.length - 1][1],
  };
}

export const HOLOCENE_PANEL = holocenePanel();

// ---------------------------------------------------------------------------
// Deep-time paleoclimate: three single-series panels that put the modern
// record in its ice-age context. All built with `trend()` (yearly interp +
// nice axis), delta chip suppressed at the card. Units are kept internal to
// each panel — the ice core works in kyr before present, the other two in
// years before present — so the matching eraMarkers() call in cards.ts uses
// the same range. X grows toward the present (year 0), so the axis reads
// oldest → today left to right.

const signedC = (v: number): string => `${v > 0 ? '+' : ''}${localeNum(v, 1)} °C`;

// 800,000 years of Antarctic ice-core temperature (EPICA Dome C / Vostok,
// Jouzel et al. 2007) as anomaly vs. the present value: eight glacial cycles,
// the sawtooth every schoolbook skips. Interglacial peaks reach +1…+3 °C, full
// glacials drop to about −9 °C — and today (0) sits on a warm peak. Antarctic
// swings run ~2× the global mean; the card says so. x = −kyr before present.
const ICE_CORE_ANCHORS: [number, number][] = [
  [-800, -6], [-790, 1], [-760, -4], [-740, -6], [-712, 1], [-680, -6],
  [-660, -7], [-620, 1.5], [-600, -4], [-575, 0], [-540, -7], [-500, -3],
  [-490, 1.5], [-465, -6], [-430, -8.5], [-410, 2], [-380, 0], [-350, -7],
  [-337, -8], [-325, 2.5], [-300, -4], [-270, -8], [-243, 2], [-220, -6],
  [-200, -7], [-160, -7], [-150, -8], [-130, -6], [-125, 3], [-110, -2],
  [-80, -4], [-65, -6], [-40, -5], [-20, -9], [-12, -4], [-10, -0.5],
  [-5, 0.3], [0, 0],
];
export const ICE_CORE_PANEL = trend(
  ICE_CORE_ANCHORS,
  signedC,
  ['800 Tsd. J.', '525 Tsd.', '250 Tsd.', 'heute'],
  120,
);

// The exit from the last ice age: global mean temperature from the Last
// Glacial Maximum to today (Osman et al. 2021 / Shakun et al. 2012), anomaly
// vs. 1850. A ~4.5 °C climb over ~10,000 years, then the instrumental jump to
// +1.3 °C at the very end. x = −years before present.
const DEGLACIATION_ANCHORS: [number, number][] = [
  [-24000, -4.5], [-21000, -4.6], [-18000, -4.4], [-17000, -4.2],
  [-16000, -3.6], [-14700, -1.6], [-14000, -1.4], [-12900, -1.8],
  [-11700, -0.6], [-10000, -0.1], [-8000, 0.2], [-6000, 0.4], [-4000, 0.2],
  [-2000, 0.05], [-170, 0.0], [-70, 0.3], [0, 1.3],
];
export const DEGLACIATION_PANEL = trend(
  DEGLACIATION_ANCHORS,
  signedC,
  ['24.000 J.', '16.000', '8.000', 'heute'],
  64,
);

// Sea level since the last ice age (Lambeck et al. 2014, PNAS): +125 m as the
// ice sheets melted, near-stable for ~7,000 years. The modern mm-scale rise is
// invisible at this scale — the card notes it. x = −years before present.
const SEALEVEL_ANCHORS: [number, number][] = [
  [-20000, -125], [-18000, -120], [-16000, -105], [-14500, -95],
  [-14000, -90], [-12000, -60], [-11500, -55], [-10000, -40], [-8000, -13],
  [-7000, -5], [-6000, -3], [-4000, -1.5], [-2000, -0.5], [0, 0],
];
export const SEALEVEL_PANEL = trend(
  SEALEVEL_ANCHORS,
  (v) => `${localeNum(v, 0)} m`,
  ['20.000 J.', '13.000', '7.000', 'heute'],
  64,
);
