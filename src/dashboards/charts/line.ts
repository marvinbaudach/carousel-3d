// Line and area charts: a two-series line with draw-in and endpoint pulse,
// and a single-series gradient area.

import {
  drawGrid,
  drawGridLabels,
  drawHeader,
  drawLegend,
  drawSurface,
  easeOut,
  fmtCompact,
  linePath,
  makeSeries,
  type Frame,
} from '../draw';
import { FONT } from '../theme';
import { plotRect, xAxisLabels } from './shared';

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
  /** Cool vertical bands over samples where mask[i] is true (e.g. ice ages). */
  shade?: { mask: boolean[]; label: string };
}

/** Two-series line chart with draw-in, endpoint pulse and direct labels. */
export function lineChart(f: Frame, cfg: LineCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const fmt = cfg.fmt ?? ((v: number) => fmtCompact(v, cfg.unit));
  const top = drawHeader(f, cfg.label, cfg.value, fmt, cfg.delta);
  const r = plotRect(f, top + 26 * u);

  // Shaded bands (behind grid + series): contiguous true-runs of the mask.
  if (cfg.shade) {
    const mask = cfg.shade.mask;
    const n = mask.length;
    ctx.fillStyle = 'rgba(96,156,224,0.13)';
    for (let i = 0; i < n; ) {
      if (!mask[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < n && mask[j]) j++;
      const x0 = r.x0 + ((r.x1 - r.x0) * (i - 0.5)) / (n - 1);
      const x1 = r.x0 + ((r.x1 - r.x0) * (j - 0.5)) / (n - 1);
      ctx.fillRect(x0, r.y0, x1 - x0, r.y1 - r.y0);
      i = j;
    }
    ctx.fillStyle = 'rgba(150,190,235,0.85)';
    ctx.font = `500 ${13 * u}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(cfg.shade.label, r.x0 + 6 * u, r.y0 + 16 * u);
  }

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
