import { CanvasTexture, SRGBColorSpace } from 'three';
import {
  areaChart,
  barChart,
  funnel,
  hBarChart,
  heatmap,
  lineChart,
  statTiles,
  ticker,
} from './charts';
import type { Frame } from './draw';
import { SERIES } from './theme';

export interface Dashboard {
  id: string;
  title: string;
  draw: (f: Frame) => void;
}

/**
 * Time fed into the one-shot idle render: far past every intro, so panels
 * show a settled chart until a hover replays the animation from 0.
 */
export const SETTLED_T = 9.7;

const [blue, aqua, yellow, , violet, , magenta, orange] = SERIES;

/** The twelve panels of the ring — one fictional SaaS analytics suite. */
export const DASHBOARDS: Dashboard[] = [
  {
    id: 'mrr',
    title: 'Monthly Recurring Revenue',
    draw: (f) =>
      lineChart(f, {
        label: 'Recurring Revenue',
        value: 248_000,
        unit: '€',
        delta: 8.2,
        seed: 11,
        series: [
          { name: 'Product', color: blue },
          { name: 'Services', color: aqua },
        ],
        ticks: ['0', '150k', '300k'],
      }),
  },
  {
    id: 'active-users',
    title: 'Active Users',
    draw: (f) =>
      areaChart(f, {
        label: 'Active Users',
        value: 84_200,
        delta: 12.4,
        seed: 23,
        color: blue,
        ticks: ['0', '50k', '100k'],
      }),
  },
  {
    id: 'latency',
    title: 'API Latency',
    draw: (f) =>
      ticker(f, {
        label: 'API Latency · p95',
        unit: ' ms',
        base: 90,
        amplitude: 95,
        threshold: 165,
        thresholdLabel: 'SLO 165 ms',
        color: violet,
        seed: 37,
        ticks: ['90', '140', '190'],
      }),
  },
  {
    id: 'regions',
    title: 'Revenue by Region',
    draw: (f) =>
      hBarChart(f, {
        label: 'Revenue by Region',
        value: 1_240_000,
        delta: 5.1,
        color: aqua,
        rows: [
          { name: 'Europe', v: 486_000 },
          { name: 'North America', v: 402_000 },
          { name: 'Asia Pacific', v: 214_000 },
          { name: 'LATAM', v: 86_000 },
          { name: 'Middle East', v: 52_000 },
        ],
      }),
  },
  {
    id: 'funnel',
    title: 'Conversion Funnel',
    draw: (f) =>
      funnel(f, {
        label: 'Conversion Funnel',
        value: 4.8,
        delta: 0.6,
        stages: [
          { name: 'Visited', v: 1 },
          { name: 'Signed up', v: 0.46 },
          { name: 'Activated', v: 0.28 },
          { name: 'Subscribed', v: 0.11 },
          { name: 'Retained 90d', v: 0.048 },
        ],
      }),
  },
  {
    id: 'engagement',
    title: 'Engagement Heatmap',
    draw: (f) =>
      heatmap(f, {
        label: 'Engagement · by hour',
        value: 0.68,
        delta: 3.4,
        seed: 53,
      }),
  },
  {
    id: 'kpis',
    title: 'Executive Overview',
    draw: (f) =>
      statTiles(f, {
        label: 'Executive Overview',
        tiles: [
          { name: 'Revenue', value: 1_240_000, fmt: (v) => `€${(v / 1e6).toFixed(2)}M`, delta: 8.2, color: blue, seed: 61 },
          { name: 'Customers', value: 3_420, fmt: (v) => `${Math.round(v).toLocaleString('en-US')}`, delta: 4.7, color: aqua, seed: 67 },
          { name: 'Churn', value: 2.1, fmt: (v) => `${v.toFixed(1)}%`, delta: -0.4, color: magenta, seed: 71 },
          { name: 'NPS', value: 62, fmt: (v) => `${Math.round(v)}`, delta: 6.0, color: violet, seed: 73 },
        ],
      }),
  },
  {
    id: 'orders',
    title: 'Orders per Month',
    draw: (f) =>
      barChart(f, {
        label: 'Orders',
        value: 18_400,
        delta: 6.8,
        seed: 83,
        color: yellow,
        ticks: ['0', '1k', '2k'],
      }),
  },
  {
    id: 'retention',
    title: 'Retention vs Churn',
    draw: (f) =>
      lineChart(f, {
        label: 'Retention Cohorts',
        value: 91_400,
        unit: '',
        delta: 2.3,
        seed: 89,
        series: [
          { name: 'Retained', color: violet },
          { name: 'At risk', color: magenta },
        ],
        ticks: ['0', '50k', '100k'],
      }),
  },
  {
    id: 'traffic',
    title: 'Traffic Sources',
    draw: (f) =>
      hBarChart(f, {
        label: 'Traffic Sources',
        value: 412_000,
        delta: 9.9,
        color: blue,
        rows: [
          { name: 'Organic search', v: 168_000 },
          { name: 'Direct', v: 112_000 },
          { name: 'Referral', v: 64_000 },
          { name: 'Social', v: 44_000 },
          { name: 'Paid', v: 24_000 },
        ],
      }),
  },
  {
    id: 'signups',
    title: 'Weekly Signups',
    draw: (f) =>
      barChart(f, {
        label: 'Signups',
        value: 2_840,
        delta: 11.2,
        seed: 97,
        color: aqua,
        ticks: ['0', '150', '300'],
      }),
  },
  {
    id: 'infra',
    title: 'Cluster Load',
    draw: (f) =>
      ticker(f, {
        label: 'Cluster Load',
        unit: '%',
        base: 34,
        amplitude: 52,
        threshold: 78,
        thresholdLabel: 'scale-out 78%',
        color: orange,
        seed: 101,
        ticks: ['30', '55', '80'],
      }),
  },
];

export interface DashboardTexture {
  tex: CanvasTexture;
  /** Redraw the dashboard at time `t` and flag the texture for upload. */
  render: (t: number) => void;
  dispose: () => void;
}

/** Offscreen canvas + texture for one dashboard, pre-rendered settled. */
export function createDashboardTexture(
  dashboard: Dashboard,
  width: number,
  height: number,
): DashboardTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;

  const render = (t: number) => {
    if (!ctx) return;
    dashboard.draw({ ctx, w: width, h: height, t, u: width / 512 });
    tex.needsUpdate = true;
  };
  render(SETTLED_T);

  return { tex, render, dispose: () => tex.dispose() };
}
