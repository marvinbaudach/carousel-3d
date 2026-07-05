# Worldpulse

Cinematic 3D analytics carousel — a tilted ring of animated dashboards
(canvas-rendered charts, KPI tiles, a world map, a live debt clock) orbits in
space with drag inertia, mouse-wheel spin and depth-of-field. Every panel
shows real public data with a geopolitical/financial bent: a US debt clock
counting up ~$60k/second (US Treasury), nuclear warheads on a world map (FAS
estimates + GeoJSON outlines), military spending top 10 and a century of
Swiss/world population (World Bank), franc strength vs EUR/USD (ECB), a
Zurich 7-day forecast with hand-drawn weather glyphs (Open-Meteo), and the
most-read Wikipedia articles globally and from Switzerland (Wikimedia). Each
page load draws a random selection from the pool. Hovering a panel replays its chart animation; clicking flies
it front-and-center at double resolution.

**Live → [marvinbaudach.github.io/worldpulse](https://marvinbaudach.github.io/worldpulse/)**

## Tech

- React Three Fiber · Three.js · drei · postprocessing (DoF, Bloom, Vignette)
- Vite 8 · React 19 · TypeScript 6 · oxlint
- Dashboards drawn with Canvas 2D into `CanvasTexture`s — only the hovered
  panel redraws/uploads per frame; a CVD-validated dark chart palette
- Live data layer: keyless CORS APIs, derived shapes cached in localStorage;
  panels fall back to demo data offline
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
