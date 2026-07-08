// Line and area charts: a two-series line with draw-in and endpoint pulse,
// and a single-series gradient area.

import { t as tr } from '../../i18n';
import {
  drawCompareHeader,
  drawGrid,
  drawGridLabels,
  drawHeader,
  drawLegend,
  drawSurface,
  easeOut,
  linePath,
  makeSeries,
  type Frame,
} from '../draw';
import { FONT } from '../theme';
import { plotRect, xAxisLabels } from './shared';

/**
 * Vertical era markers (dashed line + label) shared by the area and line
 * charts. Each label rides at the height where its dashed line crosses the
 * data curve (`curveY`), with a dot pinned on the crossing itself — the event
 * reads against the value it changed instead of sitting detached on the
 * x-axis. Labels that would collide nudge vertically until free.
 */
export function drawEraMarkers(
  f: Frame,
  r: { x0: number; x1: number; y0: number; y1: number },
  marks: { at: number; label: string }[],
  curveY: (frac: number) => number,
): void {
  if (!marks.length) return;
  const { ctx, u } = f;
  ctx.font = `500 ${13 * u}px ${FONT}`;
  const gap = 6 * u;
  const halfH = 9 * u;
  const yMin = r.y0 + 16 * u;
  const yMax = r.y1 - 12 * u;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const m of marks) {
    const label = tr(m.label);
    const frac = Math.min(1, Math.max(0, m.at));
    const mx = r.x0 + (r.x1 - r.x0) * frac;
    ctx.save();
    ctx.strokeStyle = 'rgba(224,156,96,0.8)';
    ctx.lineWidth = 1.5 * u;
    ctx.setLineDash([5 * u, 4 * u]);
    ctx.beginPath();
    ctx.moveTo(mx, r.y0);
    ctx.lineTo(mx, r.y1);
    ctx.stroke();
    ctx.restore();
    const labelW = ctx.measureText(label).width;
    const rightFits = mx + gap + labelW <= r.x1;
    const lx = mx + (rightFits ? gap : -gap);
    const x0 = rightFits ? lx : lx - labelW;
    const x1 = rightFits ? lx + labelW : lx;
    const overlaps = (y: number) =>
      placed.some((s) => x0 < s.x1 + gap && x1 + gap > s.x0 && y - halfH < s.y1 && y + halfH > s.y0);
    let ly = Math.min(yMax, Math.max(yMin, curveY(frac)));
    while (overlaps(ly) && ly + 2 * halfH <= yMax) ly += 2 * halfH;
    while (overlaps(ly) && ly - 2 * halfH >= yMin) ly -= 2 * halfH;
    placed.push({ x0, x1, y0: ly - halfH, y1: ly + halfH });
    // Leader from the crossing point to the label's inner edge, capped with a
    // dot on the dashed line so the attachment point is unambiguous.
    ctx.strokeStyle = 'rgba(224,156,96,0.8)';
    ctx.fillStyle = 'rgba(224,156,96,0.8)';
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.moveTo(mx, ly);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, ly, 2 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(236,182,132,0.9)';
    ctx.textAlign = rightFits ? 'left' : 'right';
    ctx.fillText(label, lx, ly + 4.5 * u);
    ctx.textAlign = 'left';
  }
}

/**
 * Data x-range for a plot with era markers: inset from the plot edge on any
 * side where a marker sits at (or hugs) the range boundary, so the dashed
 * line gets breathing room instead of merging with the y-axis.
 */
export function markerInsetRange(
  r: { x0: number; x1: number },
  marks: { at: number }[],
  u: number,
): { x0: number; x1: number } {
  const inset = 18 * u;
  return {
    x0: r.x0 + (marks.some((m) => m.at <= 0.03) ? inset : 0),
    x1: r.x1 - (marks.some((m) => m.at >= 0.97) ? inset : 0),
  };
}

/** y-position of the (normalized 0..1) series at a fraction of the x-range,
    matching linePath's point spacing and vertical mapping. */
export function curveYFn(
  data: number[],
  yTop: number,
  yBottom: number,
): (frac: number) => number {
  return (frac) => {
    const pos = frac * (data.length - 1);
    const i = Math.floor(pos);
    const v = data[i] + (data[Math.min(i + 1, data.length - 1)] - data[i]) * (pos - i);
    return yBottom - (yBottom - yTop) * v;
  };
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
  /** Cool vertical bands over samples where mask[i] is true (e.g. ice ages). */
  shade?: { mask: boolean[]; label: string };
  /** Vertical era markers along the x-range (0..1), e.g. reforms/treaties. */
  markers?: { at: number; label: string }[];
}

/** Two-series line chart with draw-in, endpoint pulse and direct labels. */
export function lineChart(f: Frame, cfg: LineCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = cfg.series.length > 1 ? drawCompareHeader(f, cfg.label) : drawHeader(f, cfg.label);
  const r = plotRect(f, top + 26 * u);
  const marks = cfg.markers ?? [];
  const d = markerInsetRange(r, marks, u);

  // Shaded bands (behind grid + series): contiguous true-runs of the mask.
  if (cfg.shade) {
    const mask = cfg.shade.mask;
    const n = mask.length;
    let bandStartX = r.x0;
    let firstBand = true;
    ctx.fillStyle = 'rgba(96,156,224,0.13)';
    for (let i = 0; i < n; ) {
      if (!mask[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < n && mask[j]) j++;
      const x0 = d.x0 + ((d.x1 - d.x0) * (i - 0.5)) / (n - 1);
      const x1 = d.x0 + ((d.x1 - d.x0) * (j - 0.5)) / (n - 1);
      ctx.fillRect(x0, r.y0, x1 - x0, r.y1 - r.y0);
      if (firstBand) {
        bandStartX = x0;
        firstBand = false;
      }
      i = j;
    }
    // Anchor the label to the start of the actual band, not the plot edge, so
    // a band that only covers the right side (e.g. the smartphone era) is not
    // mislabeled over the years before it. Clamp so it never spills off-plot.
    ctx.fillStyle = 'rgba(150,190,235,0.85)';
    ctx.font = `500 ${13 * u}px ${FONT}`;
    ctx.textAlign = 'left';
    const shadeLabel = tr(cfg.shade.label);
    const labelW = ctx.measureText(shadeLabel).width;
    const lx = Math.min(bandStartX + 6 * u, r.x1 - labelW - 6 * u);
    ctx.fillText(shadeLabel, Math.max(r.x0 + 6 * u, lx), r.y0 + 16 * u);
  }

  drawGrid(f, r.y0, r.y1, cfg.ticks.length);
  drawLegend(f, r.y0 - 10 * u, cfg.series);

  const p = easeOut(t / 1.4);
  const datas = cfg.series.map(
    (s, si) => s.data ?? makeSeries(cfg.seed + si * 97, 14, si === 0 ? 0.6 : 0.25),
  );
  cfg.series.forEach((s, si) => {
    const data = datas[si];
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5 * u;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const end = linePath(ctx, data, d.x0, d.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
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
  drawEraMarkers(f, { ...r, ...d }, marks, curveYFn(datas[0], r.y0 + 14 * u, r.y1 - 6 * u));
  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  xAxisLabels(f, cfg.xLabels ?? ['Q1', 'Q2', 'Q3', 'Q4'], d.x0, d.x1, r.y1);
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
  /** Vertical event marker at `at` (0..1 of the x-range), e.g. an invention. */
  marker?: { at: number; label: string };
  /** Several era markers along the x-range; labels alternate rows so close
      ones do not overlap. */
  markers?: { at: number; label: string }[];
}

/** Single-series area chart with a gradient fill sweeping in. */
export function areaChart(f: Frame, cfg: AreaCfg): void {
  const { ctx, u, t } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label);
  const r = plotRect(f, top + 26 * u);
  drawGrid(f, r.y0, r.y1, cfg.ticks.length);
  const marks = [...(cfg.marker ? [cfg.marker] : []), ...(cfg.markers ?? [])];
  const d = markerInsetRange(r, marks, u);

  const data = cfg.data ?? makeSeries(cfg.seed, 18, 0.7);
  const p = easeOut(t / 1.4);
  const grad = ctx.createLinearGradient(0, r.y0, 0, r.y1);
  grad.addColorStop(0, `${cfg.color}59`);
  grad.addColorStop(1, `${cfg.color}00`);

  const end = linePath(ctx, data, d.x0, d.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.save();
  ctx.lineTo(end.x, r.y1);
  ctx.lineTo(d.x0, r.y1);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  linePath(ctx, data, d.x0, d.x1, r.y0 + 14 * u, r.y1 - 6 * u, p);
  ctx.stroke();
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 4.5 * u, 0, Math.PI * 2);
  ctx.fill();

  // Vertical era markers (dashed line + label), drawn on top of the curve.
  drawEraMarkers(f, { ...r, ...d }, marks, curveYFn(data, r.y0 + 14 * u, r.y1 - 6 * u));

  drawGridLabels(f, r.y0, r.y1, cfg.ticks);
  xAxisLabels(f, cfg.xLabels ?? ['Mon', 'Wed', 'Fri', 'Sun'], d.x0, d.x1, r.y1);
}
