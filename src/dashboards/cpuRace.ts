// CPU-Rennen: Apples ARM-Kerne gegen Intel und AMD. Three static, bundled
// cards — there is no keyless public benchmark API, so every figure is a real,
// cited published score (no live read, no fallback needed):
//   1. single-core snapshot (who has the fastest core today),
//   2. multi-core snapshot (who has the most throughput — the picture flips),
//   3. the 2016→2025 race (Intel stagnates, AMD's Zen comeback, Apple's M1 leap).
// The process node each flagship runs on rides along as the per-row `sub` — the
// twist being that Apple, AMD *and* even Intel's newest all lean on TSMC's
// leading nodes; only Intel's older 14900K used Intel's own node.
//
// Colours: Apple = blue, AMD = red, Intel = yellow — well-separated SERIES
// slots, assigned by identity. Node/chip names are locale-invariant and pass
// through untranslated (see i18n/identical.ts); the German prose labels and
// sources are translated in i18n/{en,fr,it}.ts.

import { hBarChart, lineChart } from './charts';
import { blue, eraMarkers, red, yellow } from './cardHelpers';
import { localeNum } from '../i18n';
import type { Dashboard } from './types';

/** Geekbench-6 single-core axis top, so real scores normalise to 0..1. */
const GB6_SC_MAX = 4000;
const norm = (scores: number[]): number[] => scores.map((s) => s / GB6_SC_MAX);

// Best single-core result per vendor per year, 2016→2025, on the Geekbench-6
// scale (indicative — GB6 dates from 2023, older chips back-computed). The
// shape is the story: Intel ahead and flat on 14nm, AMD's Zen climb overtaking
// it by 2020 (Zen 3), Apple entering in 2020 with the M1 and pulling ahead.
const INTEL_SC = [1900, 2050, 2250, 2350, 2450, 2750, 2950, 3020, 3250, 3260];
const AMD_SC = [1300, 1650, 1850, 2150, 2450, 2500, 2950, 2980, 3370, 3380];
// Apple starts in 2020 (M1) — six points, drawn from startAt so the line is
// never padded with values from before the chip existed.
const APPLE_SC = [2350, 2380, 2650, 3080, 3870, 3900];
const APPLE_START = (2020 - 2016) / (2025 - 2016);

export const CPU_RACE_CARDS: Dashboard[] = [
  {
    id: 'cpu-single-core',
    title: 'Schnellste CPU-Kerne 2026',
    source:
      'Geekbench 6 · Single-Core-Score der aktuellen Flaggschiff-Chips (Apple M4, Ryzen 9 9950X, Core Ultra 9 285K), M1 als Referenz von 2020. Single-Core misst die Leistung eines einzelnen Kerns (IPC × Takt) — der sauberste Vergleich der Kern-Architektur über Plattformen hinweg; hier führt Apples ARM klar. Der Zusatz je Balken nennt die Fertigungsstruktur des Compute-Chips: Apple, AMD und selbst Intels Neuestes fertigen bei TSMC. Werte gerundet.',
    draw: (f) =>
      hBarChart(f, {
        label: 'Schnellste Kerne · Geekbench 6 Single-Core',
        value: 3870,
        delta: null,
        color: blue,
        unit: '',
        rowFmt: (v) => localeNum(v, 0),
        rows: [
          { name: 'Apple M4', v: 3870, sub: 'TSMC N3E · 3 nm' },
          { name: 'AMD Ryzen 9 9950X', v: 3370, sub: 'TSMC N4P · 4 nm' },
          { name: 'Intel Core Ultra 9 285K', v: 3250, sub: 'TSMC N3B · 3 nm' },
          { name: 'Apple M1', v: 2350, sub: 'TSMC N5 · 5 nm · 2020' },
        ],
      }),
  },
  {
    id: 'cpu-multi-core',
    title: 'Meiste CPU-Rechenkraft 2026',
    source:
      'Cinebench 2024 · Multi-Core-Score (alle Kerne unter Rendering-Last) der Flaggschiff-Chips. Multi-Core misst den Gesamtdurchsatz — hier führen die Vielkerner von AMD und Intel, Apples Bestes (M4 Max) liegt zurück. Das kehrt das Single-Core-Bild um: es gibt keinen Gesamtsieger, die Frage lautet Kern-Tempo oder Kern-Zahl. Der Zusatz je Balken nennt die Fertigungsstruktur. Werte gerundet.',
    draw: (f) =>
      hBarChart(f, {
        label: 'Meiste Rechenkraft · Cinebench 2024 Multi-Core',
        value: 2260,
        delta: null,
        color: red,
        unit: '',
        rowFmt: (v) => localeNum(v, 0),
        rows: [
          { name: 'AMD Ryzen 9 9950X', v: 2260, sub: '16× · TSMC 4 nm' },
          { name: 'Intel Core Ultra 9 285K', v: 2210, sub: '24× · TSMC 3 nm' },
          { name: 'Apple M4 Max', v: 1700, sub: '16× · TSMC 3 nm' },
          { name: 'Apple M4', v: 730, sub: '10× · TSMC 3 nm' },
        ],
      }),
  },
  {
    id: 'cpu-race',
    title: 'Das CPU-Comeback-Rennen',
    source:
      'Bestes Single-Core-Ergebnis je Hersteller und Jahr, auf die Geekbench-6-Skala normiert (indikativ — Geekbench 6 gibt es erst seit 2023, ältere Chips zurückgerechnet). Intel führt und stagniert lange auf 14 nm; AMDs Zen-Architektur (ab 2017) überholt 2020 mit Zen 3; Apple steigt 2020 mit dem M1 (ARM) ein und zieht bis 2024 an allen vorbei. Apple-Linie erst ab 2020, nicht rückwärts aufgefüllt.',
    draw: (f) =>
      lineChart(f, {
        label: 'Das Comeback-Rennen · Single-Core seit 2016',
        value: 3900,
        unit: '',
        delta: null,
        fmt: (v) => localeNum(v, 0),
        seed: 617,
        series: [
          { name: 'Intel', color: yellow, data: norm(INTEL_SC) },
          { name: 'AMD', color: red, data: norm(AMD_SC) },
          { name: 'Apple (ARM)', color: blue, data: norm(APPLE_SC), startAt: APPLE_START },
        ],
        ticks: ['0', '1000', '2000', '3000', '4000'],
        xLabels: ['2016', '2019', '2022', '2025'],
        markers: eraMarkers(2016, 2025, [
          [2017, 'Zen'],
          [2020, 'Apple M1'],
        ]),
      }),
  },
];
