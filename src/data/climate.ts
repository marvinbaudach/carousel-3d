// Climate datasets: per-country anchor points for the live world-temperature
// map (derived from the bundled outlines, so no extra geometry ships), a
// crude latitude/season climatology as its offline fallback, and the bundled
// deep-time paleoclimate reconstructions (ice cores, deglaciation, sea level).

import { localeNum } from '../i18n';
import { compareSeries, interpAt, niceScale, norm, resample, trend, yearly } from './series';
import type { CompareAnchors } from './series';
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

/**
 * Crude offline diurnal range around the climatology mean: hot, dry, low-latitude
 * belts swing hardest between afternoon high and pre-dawn low, so the amplitude
 * grows toward the equator. Deliberately rough — only fills the range list until
 * the live Open-Meteo min/max lands.
 */
function climatologyRange(lat: number, mean: number): { min: number; max: number } {
  const swing = 6 + 8 * Math.max(0, 1 - Math.abs(lat) / 45);
  return { min: mean - swing * 0.6, max: mean + swing * 0.4 };
}

const FALLBACK_RANGES: Record<string, { min: number; max: number }> = Object.fromEntries(
  TEMP_ANCHORS.map((a) => [a.iso, climatologyRange(a.lat, climatologyTemp(a.lat))]),
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

/**
 * Top-4 hottest countries (from the named subset) for the ranked list. When a
 * `rangeByIso` is supplied (live Open-Meteo, or the offline climatology fallback)
 * each row carries today's low/high so the list can show the daily range.
 */
export function hottestRows(
  byIso: Record<string, number>,
  rangeByIso?: Record<string, { min: number; max: number }>,
): { name: string; v: number; min?: number; max?: number }[] {
  return Object.entries(TEMP_NAME_BY_ISO)
    .filter(([iso]) => byIso[iso] !== undefined)
    .map(([iso, name]) => {
      const r = rangeByIso?.[iso];
      return { name, v: byIso[iso], min: r?.min, max: r?.max };
    })
    .toSorted((a, b) => b.v - a.v)
    .slice(0, 4);
}

export const FALLBACK_TEMP_ROWS = hottestRows(FALLBACK_TEMPS, FALLBACK_RANGES);

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

// Global mean surface temperature over the last 800,000 years — the global
// counterpart to the Antarctic ICE_CORE_PANEL above (Snyder 2016 / Hansen &
// Sato, marine-sediment + ice-core synthesis on the EPICA chronology), as Δ
// vs. the pre-industrial mean. Eight glacial–interglacial cycles with a ~5 °C
// global swing (Antarctica runs ~2× that). The last anchor is today (~+1.3 °C):
// at 800-kyr resolution the industrial spike is a single upstroke at the right
// edge — and it lands at or above every interglacial peak in the record. Same
// x = −kyr-before-present convention as the other paleoclimate panels.
const GLOBAL_800K_ANCHORS: [number, number][] = [
  [-800, -0.2], [-790, 0.2], [-770, -3.5], [-750, -5.0], [-720, -4.0],
  [-710, -0.3], [-690, -3.5], [-670, -5.2], [-650, -4.5], [-625, 0.2],
  [-610, -3.0], [-585, -4.8], [-560, -5.2], [-535, -0.6], [-510, -3.5],
  [-485, -5.0], [-460, -4.2], [-430, -1.5], [-424, 0.4], [-405, -2.0],
  [-385, -4.5], [-360, -5.3], [-340, -4.0], [-330, 1.0], [-305, -3.0],
  [-285, -5.0], [-260, -5.2], [-245, -0.4], [-220, -3.5], [-195, -5.0],
  [-160, -5.4], [-140, -4.8], [-128, -1.0], [-125, 1.0], [-115, -1.5],
  [-90, -3.8], [-70, -4.2], [-45, -4.6], [-30, -4.9], [-22, -4.8],
  [-18, -3.5], [-14, -2.0], [-11, -0.5], [-8, -0.1], [-2, 0.0], [0, 1.3],
];
export const GLOBAL_800K_PANEL = trend(
  GLOBAL_800K_ANCHORS,
  signedC,
  ['800 Tsd. J.', '525 Tsd.', '250 Tsd.', 'heute'],
  120,
);

// Atmospheric CO₂ over the last 800,000 years (EPICA Dome C, Lüthi et al. 2008
// / Bereiter et al. 2015 — air bubbles trapped in Antarctic ice). CO₂ tracks
// the glacial cycles between ~180 ppm (glacial) and ~290 ppm (interglacial) and
// never broke ~300 ppm in the whole record. The last anchor is today, 424 ppm:
// unlike temperature — which came close to today in past interglacials — CO₂
// leaves the natural envelope entirely, ~40 % above any peak, in a single
// upstroke at the right edge. Same x = −kyr-before-present convention.
const CO2_800K_ANCHORS: [number, number][] = [
  [-800, 240], [-790, 260], [-770, 210], [-750, 190], [-720, 220],
  [-710, 270], [-690, 230], [-670, 190], [-650, 205], [-625, 285],
  [-610, 240], [-585, 200], [-560, 190], [-535, 250], [-510, 225],
  [-485, 190], [-460, 210], [-430, 250], [-424, 290], [-405, 260],
  [-385, 215], [-360, 190], [-340, 220], [-330, 300], [-305, 250],
  [-285, 200], [-260, 190], [-245, 280], [-220, 240], [-195, 200],
  [-160, 190], [-140, 210], [-128, 260], [-125, 287], [-115, 265],
  [-90, 230], [-70, 220], [-45, 205], [-30, 190], [-22, 185],
  [-18, 200], [-14, 230], [-11, 260], [-8, 265], [-2, 280], [0, 424],
];
export const CO2_800K_PANEL = trend(
  CO2_800K_ANCHORS,
  (v) => localeNum(v, 0),
  ['800 Tsd. J.', '525 Tsd.', '250 Tsd.', 'heute'],
  120,
);

// ---------------------------------------------------------------------------
// Sober instrumental-era climate panels: the same measured record the IPCC
// reports, drawn with its own reported uncertainty rather than a single
// false-precision line, plus a few figures that climate lukewarmers cite —
// shown honestly, with the context that qualifies them written into each
// card's source caption (never a corrected/overlaid number the source did
// not report). See CLAUDE.md → "Data integrity & uncertainty".

/** A single-series panel that also carries a translucent uncertainty band,
    normalized onto the same nice y-scale as the line so the two align. */
export interface BandPanel {
  series: number[];
  band: { lo: number[]; hi: number[] };
  ticks: string[];
  latest: number;
  xLabels: string[];
}

/**
 * Build a {@link BandPanel} from sparse year→value anchors plus a matching
 * year→half-width set (the ± uncertainty). Value and band share one nice
 * scale so the shaded range sits exactly around the line. The half-width is
 * interpolated onto the same yearly grid as the value, so the two sources can
 * be declared at whatever years each is actually known.
 */
function bandPanel(
  value: [number, number][],
  halfWidth: [number, number][],
  fmt: (v: number) => string,
  xLabels: string[],
  samples = 40,
): BandPanel {
  const v = yearly(value);
  const startYear = Math.min(...value.map((p) => p[0]));
  const half = v.map((_, i) => interpAt(halfWidth, startYear + i));
  const lo = v.map((x, i) => x - half[i]);
  const hi = v.map((x, i) => x + half[i]);
  const s = niceScale(Math.min(...lo), Math.max(...hi), fmt);
  return {
    series: norm(resample(v, samples), s.lo, s.hi),
    band: {
      lo: norm(resample(lo, samples), s.lo, s.hi),
      hi: norm(resample(hi, samples), s.lo, s.hi),
    },
    ticks: s.ticks,
    latest: v[v.length - 1],
    xLabels,
  };
}

// (1) Global mean surface temperature anomaly vs. the pre-industrial baseline
// (1850–1900), decade-smoothed so a single El-Niño year doesn't headline the
// card. Consensus of HadCRUT5 / NASA GISTEMP / Berkeley Earth: the recent
// decade sits ~1.3 °C above pre-industrial (IPCC AR6: 2011–2020 = +1.09 °C;
// single years since have touched ~+1.5 °C in strong El-Niños). The band is
// the reported ~90 % measurement uncertainty — wide and honest in the 19th
// century, tight today — instead of one false-precision line.
const GLOBAL_TEMP_ANCHORS: [number, number][] = [
  [1850, 0.0], [1880, 0.0], [1900, 0.05], [1910, -0.05], [1920, 0.05],
  [1930, 0.15], [1940, 0.3], [1950, 0.25], [1960, 0.25], [1970, 0.25],
  [1980, 0.45], [1990, 0.6], [2000, 0.75], [2010, 0.95], [2015, 1.1],
  [2020, 1.25], [2024, 1.3],
];
const GLOBAL_TEMP_BAND: [number, number][] = [
  [1850, 0.16], [1900, 0.13], [1950, 0.09], [1980, 0.06], [2000, 0.05],
  [2024, 0.05],
];
export const GLOBAL_TEMP_PANEL = bandPanel(
  GLOBAL_TEMP_ANCHORS,
  GLOBAL_TEMP_BAND,
  signedC,
  ['1850', '1908', '1966', 'heute'],
  44,
);

// (6) Absolute global mean surface temperature (°C), instrumental era. The
// absolute value is only known to ~±0.5 °C across datasets — a far wider band
// than the anomaly above — which is exactly why science reports the change,
// not the absolute. Berkeley Earth: ~13.7 °C around 1850 → ~15 °C today.
const ABS_TEMP_ANCHORS: [number, number][] = [
  [1850, 13.7], [1900, 13.75], [1940, 14.0], [1960, 13.95], [1980, 14.15],
  [2000, 14.45], [2015, 14.8], [2024, 15.0],
];
const ABS_TEMP_BAND: [number, number][] = [[1850, 0.5], [2024, 0.5]];
export const ABS_TEMP_PANEL = bandPanel(
  ABS_TEMP_ANCHORS,
  ABS_TEMP_BAND,
  (v) => `${localeNum(v, 1)} °C`,
  ['1850', '1908', '1966', 'heute'],
  40,
);

// (3) Deaths from natural disasters per 100,000 people, global, decade
// averages (EM-DAT via Our World in Data). The famine/flood decades of the
// 1920s–30s dominate the early record; the rate has fallen ~30-fold since.
// The fall is adaptation (early warning, infrastructure, wealth), not fewer
// hazards — the card's caption says so, and notes damages rose meanwhile.
const DISASTER_DEATH_ANCHORS: [number, number][] = [
  [1900, 4], [1910, 6], [1920, 24], [1930, 14], [1940, 6], [1950, 4],
  [1960, 2.5], [1970, 2], [1980, 0.9], [1990, 0.6], [2000, 0.9],
  [2010, 0.4], [2020, 0.3],
];
export const DISASTER_DEATHS_PANEL = trend(
  DISASTER_DEATH_ANCHORS,
  (v) => localeNum(v, 1),
  ['1900', '1940', '1980', 'heute'],
  40,
);

// (4) Global cereal yield (t/ha), FAO via Our World in Data. Roughly tripled
// since 1961 — a genuine good-news trend, driven mainly by breeding,
// fertilizer and irrigation (the Green Revolution), with CO₂ fertilization a
// real but minor contributor. The card's caption keeps that attribution
// honest instead of implying CO₂ did it.
const CROP_YIELD_ANCHORS: [number, number][] = [
  [1961, 1.35], [1970, 1.8], [1980, 2.2], [1990, 2.75], [2000, 3.05],
  [2010, 3.5], [2020, 4.0], [2022, 4.1],
];
export const CROP_YIELD_PANEL = trend(
  CROP_YIELD_ANCHORS,
  (v) => `${localeNum(v, 1)} t`,
  ['1961', '1981', '2001', 'heute'],
  32,
);

// (2) Equilibrium climate sensitivity (°C per CO₂ doubling) across the major
// assessments: the "likely" range and the central estimate. The point of the
// card is honest, not reassuring-by-omission — the central value has sat near
// 3 °C since Charney 1979, the range widened again at AR5 and only narrowed
// for real at AR6 (2.5–4 °C). Lower/central/upper as three tracked lines.
const SENSITIVITY_ANCHORS: CompareAnchors[] = [
  { name: 'untere Grenze', pts: [[1979, 1.5], [1990, 1.5], [2007, 2.0], [2013, 1.5], [2021, 2.5]] },
  { name: 'bester Wert', pts: [[1979, 3.0], [1990, 2.5], [2007, 3.0], [2013, 3.0], [2021, 3.0]] },
  { name: 'obere Grenze', pts: [[1979, 4.5], [1990, 4.5], [2007, 4.5], [2013, 4.5], [2021, 4.0]] },
];
export const SENSITIVITY_COMPARE = compareSeries(
  SENSITIVITY_ANCHORS,
  (v) => `${localeNum(v, 1)}°`,
  { latest: 3.0 },
  43,
);

// (5) Early climate-model projections vs. observed warming (°C vs.
// 1850–1900), after Hausfather et al. 2020 (GRL): 14 of 17 models from
// 1970–2007 matched observations once corrected for the forcings that
// actually occurred. The two lines track closely — the models were roughly
// right, not alarmist.
const MODELS_OBS_ANCHORS: CompareAnchors[] = [
  { name: '🖥️ Modelle', pts: [[1970, 0.25], [1980, 0.42], [1990, 0.62], [2000, 0.8], [2010, 1.0], [2020, 1.2]] },
  { name: '🌡️ Beobachtung', pts: [[1970, 0.25], [1980, 0.45], [1990, 0.6], [2000, 0.75], [2010, 0.95], [2020, 1.25]] },
];
export const MODELS_OBS_COMPARE = compareSeries(
  MODELS_OBS_ANCHORS,
  signedC,
  { latest: 1.25 },
  50,
);
