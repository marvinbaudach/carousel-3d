// A legislative status timeline: a vertical spine of dated milestones with a
// headline status pill. Unlike the numeric renderers, this one draws a
// chronology — proposal, votes, court rulings — so the deck can carry policy
// dossiers (Chatkontrolle, Vermögensregister …) that have no clean time series.
//
// Colour is semantic, not decorative: a restriction that is *in force* burns
// CRITICAL red, one that was *blocked or struck down* (a civil-liberties win)
// reads GOOD green, so the current state of play is legible at a glance.

import { drawSurface, drawHeader, roundRect, stagger, type Frame } from '../draw';
import { BASELINE, CRITICAL, FONT, GOOD, INK_SECONDARY, SERIES } from '../theme';
import { drawSource, ellipsize, withAlpha } from './shared';
import { t as tr } from '../../i18n';

/** proposed → tabled · adopted → passed · inforce → active restriction ·
    blocked → stalled/withdrawn · court → judicial ruling. */
export type TimelineKind = 'proposed' | 'adopted' | 'inforce' | 'blocked' | 'court';

const KIND_COLOR: Record<TimelineKind, string> = {
  proposed: SERIES[0], // blue
  adopted: SERIES[2], // yellow
  inforce: CRITICAL, // red — the restriction is live
  blocked: GOOD, // green — stopped or struck down
  court: SERIES[1], // aqua — a court weighed in
};

export interface StatusTimelineCfg {
  label: string;
  /** Headline pill under the header — the current state of the dossier. */
  status: { text: string; kind: TimelineKind };
  /** Milestones oldest-first (top) to newest (bottom). */
  milestones: { date: string; text: string; kind: TimelineKind }[];
  source: string;
}

/**
 * Vertical timeline: a status pill, then a spine of milestone dots with a bold
 * date and a one-line description each. The spine and the dots reveal with a
 * per-row stagger so a hover replays the chronology top-to-bottom.
 */
export function statusTimeline(f: Frame, cfg: StatusTimelineCfg): void {
  const { ctx, u, t, w, h } = f;
  drawSurface(f);
  const top = drawHeader(f, cfg.label);
  const pad = 36 * u;
  const x0 = pad;

  // Status pill: the one-glance verdict, tinted to the current kind.
  const pillColor = KIND_COLOR[cfg.status.kind];
  const pillText = tr(cfg.status.text).toUpperCase();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${13 * u}px ${FONT}`;
  const pillW = ctx.measureText(pillText).width + 22 * u;
  const pillY = top;
  ctx.fillStyle = withAlpha(pillColor, 0.18);
  roundRect(ctx, x0, pillY, pillW, 24 * u, 12 * u);
  ctx.fill();
  ctx.fillStyle = pillColor;
  ctx.beginPath();
  ctx.arc(x0 + 12 * u, pillY + 12 * u, 4 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(pillText, x0 + 22 * u, pillY + 16.5 * u);

  // Spine + milestone rows fill the space between the pill and the footer.
  const spineX = x0 + 7 * u;
  const rowsTop = pillY + 44 * u;
  const bottom = h - (f.compact ? 26 * u : 58 * u);
  const n = cfg.milestones.length;
  const rowH = (bottom - rowsTop) / Math.max(1, n);
  const dotY = (i: number) => rowsTop + rowH * (i + 0.5);
  const textX = spineX + 22 * u;
  const maxTextW = w - pad - textX;

  // Faint full-height spine behind the dots.
  if (n > 1) {
    ctx.strokeStyle = BASELINE;
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(spineX, dotY(0));
    ctx.lineTo(spineX, dotY(n - 1));
    ctx.stroke();
  }

  cfg.milestones.forEach((m, i) => {
    const p = Math.max(0, stagger(t, i, 0.12));
    if (p <= 0) return;
    ctx.globalAlpha = p;
    const color = KIND_COLOR[m.kind];
    const y = dotY(i);

    // Coloured segment of the spine, drawn up to this dot as it reveals.
    if (i > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(spineX, dotY(i - 1));
      ctx.lineTo(spineX, y);
      ctx.stroke();
    }

    // Milestone dot with a soft halo.
    ctx.fillStyle = withAlpha(color, 0.22);
    ctx.beginPath();
    ctx.arc(spineX, y, 9 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(spineX, y, 5 * u, 0, Math.PI * 2);
    ctx.fill();

    // Bold date (in the kind colour) then the description on the same line.
    ctx.textAlign = 'left';
    ctx.font = `700 ${14 * u}px ${FONT}`;
    ctx.fillStyle = color;
    const date = tr(m.date);
    ctx.fillText(date, textX, y + 5 * u);
    const dateW = ctx.measureText(date).width + 12 * u;
    ctx.font = `500 ${14 * u}px ${FONT}`;
    ctx.fillStyle = INK_SECONDARY;
    ctx.fillText(ellipsize(ctx, tr(m.text), maxTextW - dateW), textX + dateW, y + 5 * u);
    ctx.globalAlpha = 1;
  });

  drawSource(f, cfg.source);
}
