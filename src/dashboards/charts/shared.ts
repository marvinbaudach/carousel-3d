// Helpers shared across the chart renderers: color math, the standard plot
// rectangle, axis labels, the source footer and the ranked top-N list that
// sits below the map panels.

import { roundRect, stagger, type Frame } from '../draw';
import { withFlag } from '../flags';
import { FONT, GRID, INK, INK_SECONDARY, MUTED } from '../theme';
import { t as tr } from '../../i18n';

// Re-exported so the chart renderers (bar.ts, map.ts) keep importing `withFlag`
// from './shared' — the flag table itself lives in ../flags to stay cycle-free.
export { withFlag };

/** Hex color (#rrggbb) at the given opacity. */
export function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

/** Blend a hex color (#rrggbb) toward white by amount (0..1). */
export function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/**
 * Shared horizontal ramp spanning the full track: dark and muted at the
 * baseline, full color at the midpoint, brightened at the far end. Every bar
 * is clipped to its own length, so where a bar's tip lands on this shared
 * ramp encodes its magnitude — longer bars end on hotter, brighter tones,
 * which makes the lengths directly comparable at a glance. The brightened
 * tip leaves headroom so even bars packed in a narrow high band still
 * separate by color instead of reading as one flat block.
 */
export function barGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  hex: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, withAlpha(hex, 0.32));
  g.addColorStop(0.5, hex);
  g.addColorStop(1, lighten(hex, 0.5));
  return g;
}

export const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** The standard plot rectangle: horizontal padding, `top` to a fixed footer. */
export function plotRect(f: Frame, top: number) {
  const pad = 36 * f.u;
  return { x0: pad, x1: f.w - pad, y0: top, y1: f.h - 64 * f.u };
}

/** Evenly spaced x-axis labels along the baseline. */
// Axis text uses INK_SECONDARY, not MUTED: on the dark surface the muted gray
// sits below comfortable reading contrast, and axes are primary chart reading.
// The outer labels anchor to the range ends (first left-aligned, last
// right-aligned) instead of centering on x0/x1 — a wide end label like
// "800 Tsd. J." would otherwise spill half its width past the plot edge and
// clip. Interior labels stay centered on their tick.
export function xAxisLabels(f: Frame, labels: string[], x0: number, x1: number, y: number): void {
  const { ctx, u } = f;
  ctx.fillStyle = INK_SECONDARY;
  ctx.font = `400 ${15 * u}px ${FONT}`;
  const last = labels.length - 1;
  labels.forEach((l, i) => {
    ctx.textAlign = i === 0 ? 'left' : i === last ? 'right' : 'center';
    ctx.fillText(tr(l), x0 + ((x1 - x0) * i) / last, y + 24 * u);
  });
  ctx.textAlign = 'left';
}

/**
 * Truncate `text` with a trailing ellipsis so it fits within `max` px at the
 * context's *current* font — set the font before calling. Returns the text
 * unchanged when it already fits (or when there's no room at all).
 */
export function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (max <= 0 || ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Muted source/attribution line pinned to the panel's bottom-left. */
export function drawSource(f: Frame, source: string): void {
  if (f.compact) return; // mobile shows the source behind the info button
  const { ctx, u, h, w } = f;
  ctx.fillStyle = MUTED;
  ctx.font = `400 ${13 * u}px ${FONT}`;
  ctx.textAlign = 'left';
  // Long captions (the export can fall back to a card's full caveat text) are
  // ellipsized to the panel width instead of running off the edge.
  ctx.fillText(ellipsize(ctx, tr(source), w - 72 * u), 36 * u, h - 22 * u);
  f.sourceDrawn = true;
}

/**
 * Ranked top-N list below the map panels: name left, value right, a track
 * with a magnitude-ramped bar under each. Shared by the nuke and choropleth
 * maps.
 */

export function drawRankedList(
  f: Frame,
  opts: {
    rows: { name: string; v: number }[];
    /** Y where the list starts (just below the map). */
    top: number;
    rowFmt: (v: number) => string;
    color: string;
  },
): void {
  const { ctx, u, t, w, h } = f;
  const pad = 36 * u;
  const { rows, top, rowFmt, color } = opts;
  const rowH = (h - 46 * u - top) / Math.max(1, rows.length);
  const barMax = Math.max(...rows.map((r) => r.v), 1);
  const grad = barGradient(ctx, pad, w - pad, color);
  // Label sits right above its bar (small fixed gap); the ~26u pair is
  // centered in the row slot so the slack pools between groups and each
  // label reads as tied to its own bar, not the row above.
  const groupH = 26 * u;
  rows.forEach((s, i) => {
    const p = Math.max(0, stagger(t, i + 4, 0.06));
    const y = top + rowH * i + Math.max(0, (rowH - groupH) / 2);
    ctx.globalAlpha = p;
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `500 ${16 * u}px ${FONT}`;
    ctx.fillText(withFlag(s.name), pad, y + 13 * u);
    ctx.fillStyle = INK;
    ctx.font = `600 ${16 * u}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(rowFmt(s.v * p), w - pad, y + 13 * u);
    ctx.textAlign = 'left';
    ctx.fillStyle = GRID;
    roundRect(ctx, pad, y + 19 * u, w - 2 * pad, 7 * u, 3.5 * u);
    ctx.fill();
    ctx.fillStyle = grad;
    roundRect(ctx, pad, y + 19 * u, Math.max((w - 2 * pad) * (s.v / barMax) * p, 7 * u), 7 * u, 3.5 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}
