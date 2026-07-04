// The eight dashboard archetypes. Each draws a complete panel (surface,
// header, chart) into a Frame; `t` replays the intro and drives the live
// motion afterwards, so hovering a panel feels like it wakes up.

import {
  drawGrid,
  drawGridLabels,
  drawHeader,
  drawLegend,
  drawSurface,
  drawTracked,
  easeOut,
  fmtCompact,
  linePath,
  makeSeries,
  roundRect,
  stagger,
  type Frame,
} from './draw';
import { CRITICAL, FONT, GOOD, GRID, INK, INK_SECONDARY, MUTED, SEQ, SERIES } from './theme';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function plotRect(f: Frame, top: number) {
  const pad = 36 * f.u;
  return { x0: pad, x1: f.w - pad, y0: top, y1: f.h - 64 * f.u };
}

function xAxisLabels(f: Frame, labels: string[], x0: number, x1: number, y: number): void {
  const { ctx, u } = f;
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${14 * u}px ${FONT}`;
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    ctx.fillText(l, x0 + ((x1 - x0) * i) / (labels.length - 1), y + 24 * u);
  });
  ctx.textAlign = 'left';
}

export interface LineCfg {
  label: string;
  value: number;
  unit: string;
  delta: number | null;
  fmt?: (v: number) => string;
  seed: number;
  /** `data` (normalized 0..1) wins over the seeded fallback series. */
  series: { name: string; color: string; data?: number[] }[];
  ticks: string[];
  xLabels?: string[];
}

/** Two-series line chart with draw-in, endpoint pulse and direct labels. */
export function lineChart(f: Frame, cfg: LineCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const fmt = cfg.fmt ?? ((v: number) => fmtCompact(v, cfg.unit));
  const top = drawHeader(f, cfg.label, cfg.value, fmt, cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);
  drawLegend(f, r.y0 - 10 * u, cfg.series);

  const p = easeOut(t / 1.4);
  cfg.series.forEach((s, si) => {
    const data = s.data ?? makeSeries(cfg.seed + si * 97, 14, si === 0 ? 0.6 : 0.25);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5 * u;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const end = linePath(ctx, data, r.x0, r.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
    ctx.stroke();
    // Endpoint marker; the front series gets a soft live pulse.
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 4.5 * u, 0, Math.PI * 2);
    ctx.fill();
    if (si === 0 && p >= 1) {
      const pulse = (t * 0.9) % 1;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = (1 - pulse) * 0.5;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(end.x, end.y, (5 + pulse * 14) * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  xAxisLabels(f, cfg.xLabels ?? ['Q1', 'Q2', 'Q3', 'Q4'], r.x0, r.x1, r.y1);
}

export interface AreaCfg {
  label: string;
  value: number;
  delta: number | null;
  fmt?: (v: number) => string;
  seed: number;
  color: string;
  ticks: string[];
  data?: number[];
  xLabels?: string[];
}

/** Single-series area chart with a gradient fill sweeping in. */
export function areaChart(f: Frame, cfg: AreaCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, cfg.fmt ?? ((v) => fmtCompact(v)), cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);

  const data = cfg.data ?? makeSeries(cfg.seed, 18, 0.7);
  const p = easeOut(t / 1.4);
  const grad = ctx.createLinearGradient(0, r.y0, 0, r.y1);
  grad.addColorStop(0, `${cfg.color}59`);
  grad.addColorStop(1, `${cfg.color}00`);

  const end = linePath(ctx, data, r.x0, r.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.save();
  ctx.lineTo(end.x, r.y1);
  ctx.lineTo(r.x0, r.y1);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  linePath(ctx, data, r.x0, r.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.stroke();
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 4.5 * u, 0, Math.PI * 2);
  ctx.fill();
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  xAxisLabels(f, cfg.xLabels ?? ['Mon', 'Wed', 'Fri', 'Sun'], r.x0, r.x1, r.y1);
}

export interface BarCfg {
  label: string;
  value: number;
  delta: number | null;
  fmt?: (v: number) => string;
  seed: number;
  color: string;
  ticks: string[];
  data?: number[];
  labels?: string[];
  /** Raw value of the tallest bar, for its direct label. */
  peak?: number;
}

/** Monthly vertical bars growing from the baseline, max bar direct-labeled. */
export function barChart(f: Frame, cfg: BarCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, cfg.fmt ?? ((v) => fmtCompact(v)), cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);

  const data = cfg.data ?? makeSeries(cfg.seed, 12, 0.5);
  const labels = cfg.labels ?? MONTHS;
  const maxI = data.indexOf(Math.max(...data));
  const slot = (r.x1 - r.x0) / data.length;
  const bw = slot - 2 * u - 6 * u;
  data.forEach((v, i) => {
    const p = stagger(t, i, 0.045);
    const bh = (r.y1 - r.y0 - 20 * u) * v * p;
    const x = r.x0 + slot * i + (slot - bw) / 2;
    ctx.fillStyle = cfg.color;
    roundRect(ctx, x, r.y1 - bh, bw, bh, 4 * u);
    ctx.fill();
    if (i === maxI && p >= 1) {
      ctx.fillStyle = INK;
      ctx.font = `600 ${14 * u}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(fmtCompact(cfg.peak ?? cfg.value * v), x + bw / 2, r.y1 - bh - 8 * u);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = MUTED;
    ctx.font = `400 ${13 * u}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i] ?? '', x + bw / 2, r.y1 + 22 * u);
    ctx.textAlign = 'left';
  });
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
}

export interface HBarCfg {
  label: string;
  value: number;
  delta: number | null;
  color: string;
  unit?: string;
  rows: { name: string; v: number }[];
}

/** Horizontal top-N bars sliding in, every row direct-labeled. */
export function hBarChart(f: Frame, cfg: HBarCfg): void {
  const { ctx, u, t, w } = f;
  drawSurface(f);
  const unit = cfg.unit ?? '€';
  const top = drawHeader(f, cfg.label, cfg.value, (v) => fmtCompact(v, unit), cfg.delta);
  const pad = 36 * u;
  const rowH = (f.h - 60 * u - (top + 10 * u)) / cfg.rows.length;
  const max = Math.max(...cfg.rows.map((d) => d.v));

  cfg.rows.forEach((d, i) => {
    const p = stagger(t, i, 0.08);
    const y = top + 10 * u + rowH * i;
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `500 ${17 * u}px ${FONT}`;
    ctx.fillText(d.name, pad, y + 22 * u);
    ctx.fillStyle = INK;
    ctx.font = `600 ${17 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtCompact(d.v * p, unit), w - pad, y + 22 * u);
    ctx.textAlign = 'left';

    const bw = (w - 2 * pad) * (d.v / max) * p;
    ctx.fillStyle = GRID;
    roundRect(ctx, pad, y + 34 * u, w - 2 * pad, 10 * u, 5 * u);
    ctx.fill();
    ctx.fillStyle = cfg.color;
    roundRect(ctx, pad, y + 34 * u, Math.max(bw, 10 * u), 10 * u, 5 * u);
    ctx.fill();
  });
}

export interface HeatCfg {
  label: string;
  value: number;
  delta: number | null;
  fmt?: (v: number) => string;
  seed: number;
  /** 7 rows x 12 cols, 0..1. Wins over the seeded fallback grid. */
  grid?: number[][];
  dayLabels?: string[];
}

/** Weekday x hour activity grid on the sequential ramp, cells staggering in. */
export function heatmap(f: Frame, cfg: HeatCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const fmt = cfg.fmt ?? ((v: number) => `${(v * 100).toFixed(0)}%`);
  const top = drawHeader(f, cfg.label, cfg.value, fmt, cfg.delta);
  const pad = 36 * u;
  const days = cfg.dayLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cols = 12;
  const gap = 5 * u;
  const labelW = 26 * u;
  const cw = (w - 2 * pad - labelW - gap * (cols - 1)) / cols;
  const ch = (h - 70 * u - (top + 16 * u) - gap * 6) / 7;
  const rand = rng2d(cfg.seed);

  ctx.font = `400 ${13 * u}px ${FONT}`;
  for (let row = 0; row < 7; row++) {
    const y = top + 16 * u + row * (ch + gap);
    ctx.fillStyle = MUTED;
    ctx.fillText(days[row], pad, y + ch / 2 + 5 * u);
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const p = stagger(t, i, 0.012, 0.5);
      if (p <= 0) continue;
      let v = cfg.grid ? Math.min(1, Math.max(0, cfg.grid[row][col])) : rand(row, col);
      // Live shimmer on the fake grid only — real measurements stay honest.
      if (!cfg.grid && t > 1.6 && (row * 31 + col * 17) % 23 === 0) {
        v = Math.min(1, v + 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + i)));
      }
      const step = SEQ[Math.min(SEQ.length - 1, Math.floor(v * SEQ.length))];
      const x = pad + labelW + col * (cw + gap);
      ctx.globalAlpha = p;
      ctx.fillStyle = step;
      roundRect(ctx, x, y, cw, ch, 3 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = MUTED;
  ctx.fillText('00', pad + labelW, h - 46 * u);
  ctx.textAlign = 'right';
  ctx.fillText('24h', w - pad, h - 46 * u);
  ctx.textAlign = 'left';
}

function rng2d(seed: number): (a: number, b: number) => number {
  return (a, b) => {
    const r = rngOnce(seed + a * 131 + b * 7);
    // Shape toward "work hours": center columns run hotter.
    const bias = 1 - Math.abs(b - 6.5) / 8;
    return Math.min(1, r * 0.55 + bias * 0.45);
  };
}

function rngOnce(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export interface FunnelCfg {
  label: string;
  value: number;
  delta: number | null;
  fmt?: (v: number) => string;
  stages: { name: string; v: number }[];
}

/** Conversion funnel on the ordinal blue ramp, stage percentages counting. */
export function funnel(f: Frame, cfg: FunnelCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const fmt = cfg.fmt ?? ((v: number) => `${v.toFixed(1)}%`);
  const top = drawHeader(f, cfg.label, cfg.value, fmt, cfg.delta);
  const pad = 36 * u;
  const rows = cfg.stages.length;
  const rowH = (h - 56 * u - (top + 8 * u)) / rows;
  // Ordinal steps: darkest -> lighter, all clear of the surface.
  const steps = [SEQ[1], SEQ[2], SEQ[3], SEQ[4], SEQ[6]];

  cfg.stages.forEach((s, i) => {
    const p = stagger(t, i, 0.09);
    const y = top + 8 * u + rowH * i;
    const bw = (w - 2 * pad) * s.v * p;
    ctx.fillStyle = steps[i % steps.length];
    roundRect(ctx, pad, y + rowH * 0.3, bw, rowH * 0.52, 4 * u);
    ctx.fill();
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `500 ${16 * u}px ${FONT}`;
    ctx.fillText(s.name, pad, y + rowH * 0.22);
    ctx.fillStyle = INK;
    ctx.font = `600 ${16 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${(s.v * 100 * p).toFixed(0)}%`, w - pad, y + rowH * 0.22);
    ctx.textAlign = 'left';
  });
}

export interface TilesCfg {
  label: string;
  tiles: {
    name: string;
    value: number;
    fmt: (v: number) => string;
    delta: number;
    color: string;
    seed: number;
    /** Normalized sparkline data; wins over the seeded fallback. */
    data?: number[];
  }[];
}

/** 2x2 KPI tiles: counting figures, deltas and draw-in sparklines. */
export function statTiles(f: Frame, cfg: TilesCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const pad = 36 * u;

  ctx.fillStyle = MUTED;
  ctx.font = `600 ${17 * u}px ${FONT}`;
  drawTracked(ctx, cfg.label.toUpperCase(), pad, pad + 16 * u, 2.4 * u);

  const top = pad + 44 * u;
  const gap = 16 * u;
  const tw = (w - 2 * pad - gap) / 2;
  const th = (h - top - pad - gap) / 2;

  cfg.tiles.forEach((tile, i) => {
    const p = stagger(t, i, 0.1, 0.8);
    const x = pad + (i % 2) * (tw + gap);
    const y = top + Math.floor(i / 2) * (th + gap);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, x, y, tw, th, 10 * u);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1 * u;
    roundRect(ctx, x, y, tw, th, 10 * u);
    ctx.stroke();

    const ip = 18 * u;
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${15 * u}px ${FONT}`;
    ctx.fillText(tile.name, x + ip, y + ip + 12 * u);
    ctx.fillStyle = INK;
    ctx.font = `700 ${34 * u}px ${FONT}`;
    ctx.fillText(tile.fmt(tile.value * p), x + ip, y + ip + 52 * u);
    const up = tile.delta >= 0;
    ctx.fillStyle = up ? GOOD : CRITICAL;
    ctx.font = `600 ${15 * u}px ${FONT}`;
    ctx.fillText(`${up ? '▲' : '▼'} ${Math.abs(tile.delta).toFixed(1)}%`, x + ip, y + ip + 78 * u);

    const data = tile.data ?? makeSeries(tile.seed, 16, tile.delta >= 0 ? 0.6 : -0.5);
    ctx.strokeStyle = tile.color;
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = 'round';
    linePath(ctx, data, x + ip, x + tw - ip, y + th - 52 * u, y + th - 14 * u, p);
    ctx.stroke();
  });
}

export interface TickerCfg {
  label: string;
  fmt: (v: number) => string;
  tickFmt: (v: number) => string;
  color: string;
  seed: number;
  /** Synth fallback range, used until the price socket delivers. */
  base: number;
  amplitude: number;
  threshold?: { v: number; label: string };
  /** Live price buffer; with >= 2 samples the panel draws real trades. */
  feed?: { samples(): number[] };
}

/** Live streaming line: real trades from the feed, synth noise until then. */
export function ticker(f: Frame, cfg: TickerCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);

  const buf = cfg.feed?.samples() ?? [];
  const isLive = buf.length >= 2;

  // Smooth value noise for the fallback: broad nodes carry the shape, a faint
  // second octave adds life without turning the line into a zigzag.
  const speed = 3.2; // data points per second
  const window = 40;
  const head = t * speed + window;
  const noise = (k: number, scale: number, salt: number) => {
    const kk = k / scale;
    const a = rngOnce(cfg.seed + salt + Math.floor(kk));
    const b = rngOnce(cfg.seed + salt + Math.floor(kk) + 1);
    const frac = kk - Math.floor(kk);
    const s = frac * frac * (3 - 2 * frac);
    return a + (b - a) * s;
  };
  const sample = (k: number) =>
    cfg.base + (0.8 * noise(k, 7, 0) + 0.2 * noise(k, 2.2, 1000)) * cfg.amplitude;

  // Real trades sit in a padded min/max window so small moves stay readable;
  // the synth fallback keeps its fixed base..base+amplitude scale.
  let series: number[];
  let lo: number;
  let hi: number;
  if (isLive) {
    series = buf;
    const min = Math.min(...buf);
    const max = Math.max(...buf);
    const padV = Math.max((max - min) * 0.25, buf[buf.length - 1] * 0.0003);
    lo = min - padV;
    hi = max + padV;
  } else {
    const steps = 90;
    series = Array.from({ length: steps + 1 }, (_, i) =>
      sample(head - window + (window * i) / steps),
    );
    lo = cfg.base;
    hi = cfg.base + cfg.amplitude;
  }
  const current = series[series.length - 1];
  const ticks = [lo, (lo + hi) / 2, hi].map(cfg.tickFmt);

  const top = drawHeader(f, cfg.label, current, cfg.fmt, null, undefined);
  // Live badge instead of a delta: this chart is about "now".
  const pad = 36 * u;
  ctx.fillStyle = isLive ? GOOD : MUTED;
  ctx.beginPath();
  ctx.arc(pad + 7 * u, top - 38 * u, 4.5 * u * (0.8 + 0.2 * Math.sin(t * 4)), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = `600 ${15 * u}px ${FONT}`;
  ctx.fillText(isLive ? 'LIVE' : 'SYNC', pad + 20 * u, top - 33 * u);

  const r = plotRect(f, top + 8 * u);
  drawGrid(f, r.y0, r.y1, ticks.length);

  const normY = (v: number) => r.y1 - ((r.y1 - r.y0 - 20 * u) * (v - lo)) / (hi - lo);

  // Threshold line + label, drawn only while it falls inside the window.
  if (cfg.threshold && cfg.threshold.v >= lo && cfg.threshold.v <= hi) {
    const ty = normY(cfg.threshold.v);
    ctx.strokeStyle = CRITICAL;
    ctx.setLineDash([6 * u, 6 * u]);
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.moveTo(r.x0, ty);
    ctx.lineTo(r.x1, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CRITICAL;
    ctx.font = `500 ${14 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(cfg.threshold.label, r.x1, ty - 8 * u);
    ctx.textAlign = 'left';
  }

  // The series itself, sweeping in from the left while the intro plays.
  const p = easeOut(t / 1.2);
  const last = Math.max(1, Math.round((series.length - 1) * p));
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const x = r.x0 + ((r.x1 - r.x0) * i) / (series.length - 1);
    const y = normY(series[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const hx = r.x0 + ((r.x1 - r.x0) * last) / (series.length - 1);
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(hx, normY(series[last]), 5 * u, 0, Math.PI * 2);
  ctx.fill();

  drawGridLabels(f, r.y0, r.y1, ticks);
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${14 * u}px ${FONT}`;
  ctx.fillText('-60s', r.x0, r.y1 + 24 * u);
  ctx.textAlign = 'right';
  ctx.fillText('now', r.x1, r.y1 + 24 * u);
  ctx.textAlign = 'left';
}

export interface DebtClockCfg {
  label: string;
  /** Latest official total, its record time and the recent growth rate. */
  latest: number;
  latestMs: number;
  ratePerMs: number;
  yoyPct: number;
  /** Monthly totals (normalized) for the trend area below the clock. */
  series: number[];
  ticks: string[];
  color: string;
  isLive: boolean;
}

/**
 * Debt clock: a wall-clock-extrapolated running total counting up between
 * official daily records, with the 12-month trend as an area chart below.
 */
export function debtClock(f: Frame, cfg: DebtClockCfg): void {
  const { ctx, u, t, w } = f;
  drawSurface(f);
  const pad = 36 * u;
  const p = easeOut(t / 0.9);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = MUTED;
  ctx.font = `600 ${17 * u}px ${FONT}`;
  drawTracked(ctx, cfg.label.toUpperCase(), pad, pad + 16 * u, 2.4 * u);

  // The running figure, auto-fitted so all 17 digits stay inside the panel.
  const now = cfg.latest + Math.max(0, Date.now() - cfg.latestMs) * cfg.ratePerMs;
  const text = `$${Math.round(now * p).toLocaleString('en-US')}`;
  let size = 44 * u;
  ctx.font = `700 ${size}px ${FONT}`;
  const maxW = w - 2 * pad;
  const tw = ctx.measureText(text).width;
  if (tw > maxW) {
    size *= maxW / tw;
    ctx.font = `700 ${size}px ${FONT}`;
  }
  ctx.fillStyle = INK;
  ctx.fillText(text, pad, pad + 74 * u);

  // Rising debt is the alarming direction: the YoY chip stays critical-red.
  const chipText = `▲ ${cfg.yoyPct.toFixed(1)}% YoY`;
  ctx.font = `600 ${19 * u}px ${FONT}`;
  const cw = ctx.measureText(chipText).width;
  const cy = pad + 106 * u;
  ctx.fillStyle = 'rgba(208,59,59,0.14)';
  roundRect(ctx, pad - 6 * u, cy - 20 * u, cw + 20 * u, 30 * u, 15 * u);
  ctx.fill();
  ctx.fillStyle = CRITICAL;
  ctx.fillText(chipText, pad + 4 * u, cy + 2 * u);

  const perSec = cfg.ratePerMs * 1000;
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${17 * u}px ${FONT}`;
  ctx.fillText(
    `${perSec >= 0 ? '+' : '−'}$${Math.abs(Math.round(perSec)).toLocaleString('en-US')} / second`,
    pad + cw + 32 * u,
    cy + 2 * u,
  );

  // Live pulse dot, matching the ticker panels' vocabulary.
  ctx.fillStyle = cfg.isLive ? GOOD : MUTED;
  ctx.beginPath();
  ctx.arc(w - pad - 44 * u, pad + 10 * u, 4.5 * u * (0.8 + 0.2 * Math.sin(t * 4)), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = `600 ${15 * u}px ${FONT}`;
  ctx.fillText(cfg.isLive ? 'LIVE' : 'SYNC', w - pad - 32 * u, pad + 15 * u);

  // 12-month trend as a gradient area.
  const r = plotRect(f, pad + 158 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);
  const grad = ctx.createLinearGradient(0, r.y0, 0, r.y1);
  grad.addColorStop(0, `${cfg.color}59`);
  grad.addColorStop(1, `${cfg.color}00`);
  const end = linePath(ctx, cfg.series, r.x0, r.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.save();
  ctx.lineTo(end.x, r.y1);
  ctx.lineTo(r.x0, r.y1);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  linePath(ctx, cfg.series, r.x0, r.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.stroke();
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 4.5 * u, 0, Math.PI * 2);
  ctx.fill();
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  xAxisLabels(f, ['-12mo', '-8mo', '-4mo', 'now'], r.x0, r.x1, r.y1);
}

export interface ForecastCfg {
  label: string;
  current: number;
  /** Seven days, today first, with WMO weather codes. */
  days: { day: string; code: number; min: number; max: number }[];
}

type IconKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'thunder';

function iconFor(code: number): IconKind {
  if (code === 0) return 'sun';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'rain';
}

/** Small hand-drawn weather glyphs in the charts' color vocabulary. */
function drawWeatherIcon(
  ctx: CanvasRenderingContext2D,
  kind: IconKind,
  cx: number,
  cy: number,
  s: number,
): void {
  const [, , yellow] = SERIES;
  const sun = (x: number, y: number, r: number) => {
    ctx.strokeStyle = yellow;
    ctx.fillStyle = yellow;
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
      ctx.lineTo(x + Math.cos(a) * r * 1.95, y + Math.sin(a) * r * 1.95);
      ctx.stroke();
    }
  };
  const cloud = (x: number, y: number, k: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - 0.42 * k, y + 0.1 * k, 0.34 * k, Math.PI * 0.4, Math.PI * 1.6);
    ctx.arc(x - 0.06 * k, y - 0.22 * k, 0.42 * k, Math.PI * 0.9, Math.PI * 1.98);
    ctx.arc(x + 0.44 * k, y + 0.06 * k, 0.36 * k, Math.PI * 1.3, Math.PI * 0.55);
    ctx.closePath();
    ctx.fill();
  };

  switch (kind) {
    case 'sun':
      sun(cx, cy, s * 0.52);
      break;
    case 'partly':
      sun(cx + s * 0.34, cy - s * 0.34, s * 0.36);
      cloud(cx - s * 0.08, cy + s * 0.18, s * 0.96, 'rgba(214,222,236,0.92)');
      break;
    case 'cloud':
      cloud(cx, cy, s * 1.06, 'rgba(214,222,236,0.92)');
      break;
    case 'fog':
      cloud(cx, cy - s * 0.22, s * 0.9, 'rgba(214,222,236,0.65)');
      ctx.strokeStyle = 'rgba(214,222,236,0.8)';
      ctx.lineWidth = s * 0.12;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.5 + i * s * 0.12, cy + s * 0.34 + i * s * 0.26);
        ctx.lineTo(cx + s * 0.5 - i * s * 0.12, cy + s * 0.34 + i * s * 0.26);
        ctx.stroke();
      }
      break;
    case 'rain':
      cloud(cx, cy - s * 0.22, s * 0.9, 'rgba(214,222,236,0.92)');
      ctx.strokeStyle = SERIES[1];
      ctx.lineWidth = s * 0.13;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * s * 0.34 + s * 0.06, cy + s * 0.3);
        ctx.lineTo(cx + i * s * 0.34 - s * 0.08, cy + s * 0.62);
        ctx.stroke();
      }
      break;
    case 'snow':
      cloud(cx, cy - s * 0.22, s * 0.9, 'rgba(214,222,236,0.92)');
      ctx.fillStyle = '#eef3fb';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * s * 0.34, cy + s * 0.46 + Math.abs(i) * s * 0.08, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'thunder':
      cloud(cx, cy - s * 0.26, s * 0.9, 'rgba(214,222,236,0.92)');
      ctx.fillStyle = yellow;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.1, cy - s * 0.05);
      ctx.lineTo(cx - s * 0.22, cy + s * 0.38);
      ctx.lineTo(cx - s * 0.02, cy + s * 0.38);
      ctx.lineTo(cx - s * 0.14, cy + s * 0.72);
      ctx.lineTo(cx + s * 0.26, cy + s * 0.24);
      ctx.lineTo(cx + s * 0.04, cy + s * 0.24);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/**
 * 7-day forecast: one row per day with a weather glyph and the min–max span
 * drawn as a bar on a scale shared across the week (iOS-weather style).
 */
export function weatherForecast(f: Frame, cfg: ForecastCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.current, (v) => `${v.toFixed(1)}°C`, null);
  const pad = 36 * u;

  const lo = Math.min(...cfg.days.map((d) => d.min));
  const hi = Math.max(...cfg.days.map((d) => d.max));
  const span = Math.max(1, hi - lo);

  const rowH = (h - 50 * u - top) / cfg.days.length;
  // Columns: day label | icon | min° | range bar | max°
  const barX0 = pad + 172 * u;
  const barX1 = w - pad - 44 * u;

  cfg.days.forEach((d, i) => {
    const p = stagger(t, i, 0.07);
    if (p <= 0) return;
    const y = top + rowH * i + rowH / 2;
    ctx.globalAlpha = p;

    ctx.fillStyle = i === 0 ? INK : INK_SECONDARY;
    ctx.font = `${i === 0 ? 600 : 500} ${17 * u}px ${FONT}`;
    ctx.fillText(d.day, pad, y + 6 * u);

    drawWeatherIcon(ctx, iconFor(d.code), pad + 92 * u, y, 17 * u);

    ctx.fillStyle = MUTED;
    ctx.font = `500 ${16 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(d.min)}°`, barX0 - 10 * u, y + 6 * u);
    ctx.textAlign = 'left';

    // Track plus the day's min–max span, growing with the stagger.
    ctx.fillStyle = GRID;
    roundRect(ctx, barX0, y - 4 * u, barX1 - barX0, 8 * u, 4 * u);
    ctx.fill();
    const x0 = barX0 + (barX1 - barX0) * ((d.min - lo) / span);
    const x1 = barX0 + (barX1 - barX0) * ((d.max - lo) / span);
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, SERIES[0]);
    grad.addColorStop(1, SERIES[2]);
    ctx.fillStyle = grad;
    roundRect(ctx, x0, y - 4 * u, Math.max((x1 - x0) * p, 8 * u), 8 * u, 4 * u);
    ctx.fill();

    ctx.fillStyle = INK;
    ctx.font = `600 ${16 * u}px ${FONT}`;
    ctx.fillText(`${Math.round(d.max)}°`, barX1 + 10 * u, y + 6 * u);
    ctx.globalAlpha = 1;
  });
}

export interface NukeMapCfg {
  label: string;
  total: number;
  /** Estimated warheads with a rough country-center anchor. */
  states: { name: string; lon: number; lat: number; count: number }[];
  /** Country outline rings ([lon, lat] points); graticule-only fallback. */
  world?: number[][][];
  source: string;
}

/**
 * World map with warhead stockpiles as scaled circles, plus a direct-labeled
 * top-5 list below. Equirectangular, cropped to 85°N..60°S.
 */
export function nukeMap(f: Frame, cfg: NukeMapCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.total, (v) => fmtCompact(v), null);
  const pad = 36 * u;

  const mx0 = pad;
  const mw = w - 2 * pad;
  const mh = mw / 2;
  const my0 = top + 4 * u;
  const px = (lon: number) => mx0 + ((lon + 180) / 360) * mw;
  const py = (lat: number) => my0 + ((85 - Math.min(85, Math.max(-60, lat))) / 145) * mh;

  if (cfg.world) {
    ctx.fillStyle = 'rgba(214,222,236,0.09)';
    for (const ring of cfg.world) {
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => {
        if (i === 0) ctx.moveTo(px(lon), py(lat));
        else ctx.lineTo(px(lon), py(lat));
      });
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // No geometry (yet): a quiet graticule keeps the map readable.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1 * u;
    for (let lon = -150; lon <= 150; lon += 30) {
      ctx.beginPath();
      ctx.moveTo(px(lon), my0);
      ctx.lineTo(px(lon), my0 + mh);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 80; lat += 20) {
      ctx.beginPath();
      ctx.moveTo(mx0, py(lat));
      ctx.lineTo(mx0 + mw, py(lat));
      ctx.stroke();
    }
  }

  // Warhead circles, area-true (radius ~ sqrt), staggering in.
  const maxCount = Math.max(...cfg.states.map((s) => s.count));
  const rMax = 24 * u;
  cfg.states.forEach((s, i) => {
    const p = stagger(t, i, 0.06);
    if (p <= 0) return;
    const r = Math.max(3 * u, rMax * Math.sqrt(s.count / maxCount)) * p;
    const x = px(s.lon);
    const y = py(s.lat);
    ctx.fillStyle = 'rgba(240,177,66,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = SERIES[2];
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Top-5 list under the map, direct-labeled.
  const rows = cfg.states.toSorted((a, b) => b.count - a.count).slice(0, 5);
  const ly0 = my0 + mh + 18 * u;
  const rowH = (h - 46 * u - ly0) / rows.length;
  const barMax = Math.max(...rows.map((r) => r.count));
  rows.forEach((s, i) => {
    const p = stagger(t, i + 4, 0.06);
    const y = ly0 + rowH * i;
    ctx.globalAlpha = Math.max(0, p);
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `500 ${16 * u}px ${FONT}`;
    ctx.fillText(s.name, pad, y + 15 * u);
    ctx.fillStyle = INK;
    ctx.font = `600 ${16 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtCompact(s.count * Math.max(0, p)), w - pad, y + 15 * u);
    ctx.textAlign = 'left';
    ctx.fillStyle = GRID;
    roundRect(ctx, pad, y + 24 * u, w - 2 * pad, 7 * u, 3.5 * u);
    ctx.fill();
    ctx.fillStyle = SERIES[2];
    roundRect(ctx, pad, y + 24 * u, Math.max((w - 2 * pad) * (s.count / barMax) * Math.max(0, p), 7 * u), 7 * u, 3.5 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = MUTED;
  ctx.font = `400 ${13 * u}px ${FONT}`;
  ctx.fillText(cfg.source, pad, h - 22 * u);
}
