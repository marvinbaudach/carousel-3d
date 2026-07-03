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
import { CRITICAL, FONT, GOOD, GRID, INK, INK_SECONDARY, MUTED, SEQ } from './theme';

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
  delta: number;
  seed: number;
  series: { name: string; color: string }[];
  ticks: string[];
}

/** Two-series line chart with draw-in, endpoint pulse and direct labels. */
export function lineChart(f: Frame, cfg: LineCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => fmtCompact(v, cfg.unit), cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);
  drawLegend(f, r.y0 - 10 * u, cfg.series);

  const p = easeOut(t / 1.4);
  cfg.series.forEach((s, si) => {
    const data = makeSeries(cfg.seed + si * 97, 14, si === 0 ? 0.6 : 0.25);
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
  xAxisLabels(f, ['Q1', 'Q2', 'Q3', 'Q4'], r.x0, r.x1, r.y1);
}

export interface AreaCfg {
  label: string;
  value: number;
  delta: number;
  seed: number;
  color: string;
  ticks: string[];
}

/** Single-series area chart with a gradient fill sweeping in. */
export function areaChart(f: Frame, cfg: AreaCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => fmtCompact(v), cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);

  const data = makeSeries(cfg.seed, 18, 0.7);
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
  xAxisLabels(f, ['Mon', 'Wed', 'Fri', 'Sun'], r.x0, r.x1, r.y1);
}

export interface BarCfg {
  label: string;
  value: number;
  delta: number;
  seed: number;
  color: string;
  ticks: string[];
}

/** Monthly vertical bars growing from the baseline, max bar direct-labeled. */
export function barChart(f: Frame, cfg: BarCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => fmtCompact(v), cfg.delta);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);

  const data = makeSeries(cfg.seed, 12, 0.5);
  const maxI = data.indexOf(Math.max(...data));
  const slot = (r.x1 - r.x0) / 12;
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
      ctx.fillText(fmtCompact(cfg.value * v), x + bw / 2, r.y1 - bh - 8 * u);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = MUTED;
    ctx.font = `400 ${13 * u}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(MONTHS[i], x + bw / 2, r.y1 + 22 * u);
    ctx.textAlign = 'left';
  });
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
}

export interface HBarCfg {
  label: string;
  value: number;
  delta: number;
  color: string;
  rows: { name: string; v: number }[];
}

/** Horizontal top-N bars sliding in, every row direct-labeled. */
export function hBarChart(f: Frame, cfg: HBarCfg): void {
  const { ctx, u, t, w } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => fmtCompact(v, '€'), cfg.delta);
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
    ctx.fillText(fmtCompact(d.v * p, '€'), w - pad, y + 22 * u);
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
  delta: number;
  seed: number;
}

/** Weekday x hour activity grid on the sequential ramp, cells staggering in. */
export function heatmap(f: Frame, cfg: HeatCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => `${(v * 100).toFixed(0)}%`, cfg.delta);
  const pad = 36 * u;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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
      let v = rand(row, col);
      // Live shimmer: a handful of cells breathe once the grid has settled.
      if (t > 1.6 && (row * 31 + col * 17) % 23 === 0) {
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
  delta: number;
  stages: { name: string; v: number }[];
}

/** Conversion funnel on the ordinal blue ramp, stage percentages counting. */
export function funnel(f: Frame, cfg: FunnelCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label, cfg.value, (v) => `${v.toFixed(1)}%`, cfg.delta);
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
  tiles: { name: string; value: number; fmt: (v: number) => string; delta: number; color: string; seed: number }[];
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

    const data = makeSeries(tile.seed, 16, tile.delta >= 0 ? 0.6 : -0.5);
    ctx.strokeStyle = tile.color;
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = 'round';
    linePath(ctx, data, x + ip, x + tw - ip, y + th - 52 * u, y + th - 14 * u, p);
    ctx.stroke();
  });
}

export interface TickerCfg {
  label: string;
  unit: string;
  base: number;
  amplitude: number;
  threshold: number;
  thresholdLabel: string;
  color: string;
  seed: number;
  ticks: string[];
}

/** Live streaming line: the window scrolls forever, the figure updates live. */
export function ticker(f: Frame, cfg: TickerCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);

  const speed = 3.2; // data points per second
  const window = 40;
  const head = t * speed + window;
  // Smooth value noise: broad nodes carry the shape, a faint second octave
  // adds life without turning the line into a zigzag.
  const noise = (k: number, scale: number, salt: number) => {
    const kk = k / scale;
    const a = rngOnce(cfg.seed + salt + Math.floor(kk));
    const b = rngOnce(cfg.seed + salt + Math.floor(kk) + 1);
    const frac = kk - Math.floor(kk);
    const s = frac * frac * (3 - 2 * frac);
    return a + (b - a) * s;
  };
  const sample = (k: number) => 0.8 * noise(k, 7, 0) + 0.2 * noise(k, 2.2, 1000);
  const current = cfg.base + sample(head) * cfg.amplitude;

  const top = drawHeader(
    f,
    cfg.label,
    current,
    (v) => `${Math.round(v)}${cfg.unit}`,
    null,
    undefined,
  );
  // Live badge instead of a delta: this chart is about "now".
  const pad = 36 * u;
  ctx.fillStyle = GOOD;
  ctx.beginPath();
  ctx.arc(pad + 7 * u, top - 38 * u, 4.5 * u * (0.8 + 0.2 * Math.sin(t * 4)), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = `600 ${15 * u}px ${FONT}`;
  ctx.fillText('LIVE', pad + 20 * u, top - 33 * u);

  const r = plotRect(f, top + 8 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);

  // Threshold line + label.
  const norm = (v: number) => (v - cfg.base) / cfg.amplitude;
  const ty = r.y1 - (r.y1 - r.y0 - 20 * u) * norm(cfg.threshold);
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
  ctx.fillText(cfg.thresholdLabel, r.x1, ty - 8 * u);
  ctx.textAlign = 'left';

  // The scrolling series itself.
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const k = head - window + (window * i) / steps;
    const x = r.x0 + ((r.x1 - r.x0) * i) / steps;
    const y = r.y1 - (r.y1 - r.y0 - 20 * u) * sample(k);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const hy = r.y1 - (r.y1 - r.y0 - 20 * u) * sample(head);
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(r.x1, hy, 5 * u, 0, Math.PI * 2);
  ctx.fill();

  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${14 * u}px ${FONT}`;
  ctx.fillText('-60s', r.x0, r.y1 + 24 * u);
  ctx.textAlign = 'right';
  ctx.fillText('now', r.x1, r.y1 + 24 * u);
  ctx.textAlign = 'left';
}
