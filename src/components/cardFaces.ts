import { CanvasTexture } from 'three';

// Shared, lazily-built canvas textures for the ring panels: singletons every
// panel reuses, so the whole ring costs one upload regardless of card count.
// Built lazily (not at module load) so importing this file from a non-browser
// context — e.g. a test harness rasterising cards — never touches `document`.
// (Panel backs render the card's own chart, UV-flipped, straight from the
// dashboard texture — see CarouselItem/HeroCard — so no back texture lives
// here anymore.)

/** Rounded-rect alpha mask for the frost pane, matching the panel face: 4:5
    aspect, corner radius 0.06 on the 2.4-wide plane (the drei Image radius in
    CarouselItem) — so the pane's silhouette hugs the card instead of poking
    square corners past the rounded chart. */
function makeFrostMaskTexture(): CanvasTexture {
  const w = 256;
  const h = 320;
  const r = (0.06 / 2.4) * w;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(canvas);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.fill();

  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

let frostMaskTex: CanvasTexture | null = null;

export function getFrostMaskTexture(): CanvasTexture {
  if (!frostMaskTex) frostMaskTex = makeFrostMaskTexture();
  return frostMaskTex;
}
