import { CanvasTexture, SRGBColorSpace } from 'three';
import { SETTLED_T, type Dashboard } from './types';

export interface DashboardTexture {
  tex: CanvasTexture;
  /** Redraw the dashboard at time `t` and flag the texture for upload. */
  render: (t: number) => void;
  dispose: () => void;
}

/** Offscreen canvas + texture for one dashboard, pre-rendered settled.
    `frost` fills the surface translucent for panels backed by a FrostPlate
    (see Frame.frost in draw.ts). */
export function createDashboardTexture(
  dashboard: Dashboard,
  width: number,
  height: number,
  frost = false,
): DashboardTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;

  const render = (t: number) => {
    if (!ctx) return;
    dashboard.draw({ ctx, w: width, h: height, t, u: width / 512, frost });
    tex.needsUpdate = true;
  };
  render(SETTLED_T);

  return { tex, render, dispose: () => tex.dispose() };
}
