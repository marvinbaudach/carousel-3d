# Pulse

Cinematic 3D analytics carousel — a tilted ring of twelve animated business
dashboards (canvas-rendered line/area/bar charts, heatmap, funnel, KPI tiles,
live tickers) orbits in space with drag inertia, mouse-wheel spin and
depth-of-field. Hovering a panel replays its chart animation; clicking flies it
front-and-center at double resolution. Dismiss with click-away, Esc or scroll.

**Live → [marvinbaudach.github.io/carousel-3d](https://marvinbaudach.github.io/carousel-3d/)**

## Tech

- React Three Fiber · Three.js · drei · postprocessing (DoF, Bloom, Vignette)
- Vite 8 · React 19 · TypeScript 6 · oxlint
- Dashboards drawn with Canvas 2D into `CanvasTexture`s — only the hovered
  panel redraws/uploads per frame; a CVD-validated dark chart palette
- Rotation driven entirely in `useFrame` (no per-frame React state)
- Adaptive quality: `PerformanceMonitor` walks render resolution, drops DoF
- GitHub Pages via Actions

## Develop

```bash
npm install
npm run dev      # dev server
npm run build    # type-checked production build
npm run lint
```

Deploys to GitHub Pages on push to `main`.
