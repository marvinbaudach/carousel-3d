/** Rendered thumbnails / total, clamped to an integer percentage. */
export function progressPct(rendered: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((rendered / total) * 100)));
}
