# Wild Frames

Cinematic 3D image carousel — a tilted ring of nature photos orbits in space with
drag inertia, mouse-wheel spin, and depth-of-field. Click a card to flip and fly it
to the viewer; dismiss with click-away, Esc, or scroll. Images preload behind a 3D
orbital loading screen.

**Live → [marvinbaudach.github.io/carousel-3d](https://marvinbaudach.github.io/carousel-3d/)**

## Tech

- React Three Fiber · Three.js · drei · postprocessing (DoF, Bloom, Vignette)
- Vite 8 · React 19 · TypeScript 6 · oxlint
- Rotation driven entirely in `useFrame` (no per-frame React state)
- Real image prefetch with `Image.decode()` + progress; anisotropic textures
- GitHub Pages via Actions

## Develop

```bash
npm install
npm run dev      # dev server
npm run build    # type-checked production build
npm run lint
```

Deploys to GitHub Pages on push to `main`. Images from [Picsum](https://picsum.photos).
