# Design: Desktop-Gallery + Mobile-App-Split

- **Date:** 2026-07-11
- **Status:** Approved (design), pending implementation plan
- **Branch (to create):** `feat/desktop-gallery-split`

## 1. Context & Goals

Worldpulse today serves one of two experiences chosen at runtime by `useIsMobile()`
(`max-width: 820px` OR `pointer: coarse`):

- **Desktop:** a WebGL 3D carousel ring (`Carousel3D`, React Three Fiber) behind a
  playful staged loading screen. A card **gallery** exists only as a dev-only,
  desktop-only review tool (`src/dev/`, gated behind `import.meta.env.DEV`).
- **Mobile/Tablet:** a 2D-canvas swipe deck (`MobileDeck`) behind the same loader.

The owner wants the **desktop** experience to become **calmer and less playful**:
drop the 3D carousel and the animated loader, and ship the **gallery** as the
production desktop UI. The **mobile/tablet** experience is loved and must stay
**exactly as it is** (including its loading screen). The app must remain
**installable as a PWA on Android**.

### Goals

1. Desktop (fine pointer, > 820px) shows **only the gallery** — no loader, no 3D
   carousel. Skeleton cards + a small progress indicator during load.
2. Desktop backdrop = a soft **Ubuntu-aubergine gradient** that slowly drifts, with
   a **per-category mood shift** (the active filter subtly tints the gradient).
3. Mobile/Tablet path unchanged (loader + `MobileDeck`), encapsulated in its own
   module/chunk.
4. Clean **code separation** between the two experiences via a runtime device
   switch that lazy-loads each into its **own chunk** (desktop never ships the
   R3F/WebGL code; mobile never ships the gallery).
5. Convenience **dev scripts / URL override** to preview either experience on any
   device.
6. **PWA installability on Android** preserved and verified.

### Non-Goals

- No redesign of the mobile/tablet experience (pixel-identical to today).
- No offline caching (the service worker stays a minimal no-op, as documented).
- No change to card definitions, data sources, i18n dictionaries, or the drawing
  layer (`draw.ts`, `dashboards/*`).

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Code separation | **Runtime device switch + lazy chunks.** One build, one deploy, one PWA. |
| Desktop backdrop | **Aubergine (Ubuntu-purple) gradient**, slow drift, **per-category mood shift**. Pure CSS — no WebGL. |
| 3D carousel | **Removed from the product** (retire the whole R3F scene). |
| Loader | **Desktop: none** (skeletons + progress). **Mobile/tablet: unchanged.** |
| Dev preview | `?view=mobile` / `?view=desktop` URL override + convenience npm scripts. |

## 3. Target Architecture

`App.tsx` becomes a thin device switch that lazy-loads exactly one experience:

```
App.tsx
 ├─ isMobile → lazy <MobileApp/>    → LoadingScreen + MobileDeck  [UNCHANGED behaviour]
 └─ desktop  → lazy <DesktopApp/>   → Gallery (skeletons + progress, aubergine backdrop)
```

- `useIsMobile()` keeps `MOBILE_QUERY = '(max-width: 820px), (pointer: coarse)'`, so
  **tablets stay on the mobile experience** (as desired). A new `?view=` override
  forces a specific experience for previewing.
- Each experience is a separate `React.lazy()` import, so Vite emits **two chunks**.
  The desktop chunk contains the gallery + CSS backdrop and **no `three`/R3F**;
  the mobile chunk contains the loader + deck.

### Proposed folder layout

```
src/
  App.tsx                         # device switch; lazy MobileApp | DesktopApp; ?view override
  hooks/useIsMobile.ts            # + readViewOverride()
  mobile/
    MobileApp.tsx                 # today's mobile path: boot beat, loadLiveData, LoadingScreen, MobileDeck
  desktop/
    DesktopApp.tsx                # gallery shell: backdrop, skeletons, progress, no loader
    gallery/                      # moved from src/dev/, DEV gate removed, productionised
      Gallery.tsx                 # was DevGallery.tsx (dev-only toggles removed)
      GalleryGrid.tsx
      GalleryThumb.tsx
      GalleryLightbox.tsx
      GalleryToolbar.tsx          # remove "← App" / close; keep search/category/size/language/count
      GalleryCardMenu.tsx
      GlassSelect.tsx
      galleryData.ts
      galleryChrome.ts
      AubergineBackdrop.tsx       # NEW — replaces GalleryBackdrop.tsx (WebGL) with CSS gradient
      GallerySkeletons.tsx        # NEW — skeleton grid + progress bar
  components/                     # shared + mobile-only (LoadingScreen/, MobileDeck, FavPill, DeckActionMenu, ...)
```

### Removed from the product (retire the R3F carousel scene)

`three`/`@react-three/*`/`postprocessing`/`drei` are used **only** by the desktop
carousel (verified: the loader and `MobileDeck` are 2D-canvas). Removing the
carousel retires the entire WebGL layer:

- `Carousel3D`, `CarouselItem`, `HeroCard`, `HeroScrim`, `Aurora`, `Afterglow`,
  `Dust`, `CameraRig`, `ClockContinuity`, `PerfHud`
- `hooks/useCarouselRotation.ts`, `hooks/useDashboardTexture.ts`,
  `dashboards/texture.ts`
- `dev/GalleryBackdrop.tsx` (WebGL backdrop → replaced by `AubergineBackdrop`)
- `DevGalleryLink`, the `g` hotkey and `?gallery` toggle in `App.tsx`
- `useEnvironment.preload` call in `App.tsx`

After removal, **verify no remaining `three`/R3F imports**, then drop those
packages from `package.json` (large bundle reduction). If any stray import
remains, keep the dependency and note it — dependency removal must not break the
build.

## 4. Desktop Gallery Experience

### Backdrop — `AubergineBackdrop`
- Pure CSS layered `radial-gradient` mesh in the Ubuntu-aubergine family
  (deep aubergine → plum → magenta over a near-black base).
- **Slow drift:** `background-position` keyframe over ~24–30 s, `alternate`, subtle
  deltas. `@media (prefers-reduced-motion: reduce)` freezes it to a static image.
- **Per-category mood:** the active filter's accent (from `TAGS[].accent`, the
  existing `SERIES` palette) blends a hint into the gradient so switching filters
  shifts atmosphere (TECH→violet, GELD→gold, KRIEG→red, …). Aubergine stays
  dominant; the accent is a tint, not a takeover. Cross-fade on category change.

### Loading — skeletons + progress (no full-screen loader)
- The gallery shell (toolbar + backdrop) renders **immediately**.
- The grid renders **skeleton cards** (rounded placeholders, shimmer, target cell
  size) right away.
- A thin **progress bar** (top edge) reflects an honest, determinate signal:
  **thumbnails rendered / total** (the dominant cost). Live-data feeds continue in
  the background; cards have bundled fallbacks, so data readiness is not a gate.
- As each thumbnail completes its first paint, its skeleton cross-fades to the real
  canvas (staggered). Progress bar fills, then fades out.
- Dictionary readiness (`ensureLocaleReady`) still gates the **first** thumbnail
  paint so a non-German visitor never sees a flash of German.

### Toolbar & content (productionise the dev gallery)
- Keep: search, category filter, size slider, language switch, result count,
  lightbox, per-card context menu (export/copy).
- Remove dev-only affordances: `← App` / close (no carousel behind it), the `g`
  hotkey, `?gallery` param.
- Ensure all visible copy is user-facing German and i18n-covered (reuse existing
  keys; add any new label to `{en,fr,it}` or `identical.ts`).

## 5. Mobile / Tablet Experience (unchanged)

`MobileApp.tsx` encapsulates today's mobile path verbatim: the boot beat + loader
gating (`done && dictReady`), `loadLiveData()`, `LoadingScreen`, `MobileDeck`
(with the just-enlarged `FavPill`/`DeckActionMenu` icons). No visual change — only
moved behind a lazy chunk. `useEnvironment.preload` (desktop-only) is not part of
this path.

## 6. Device Detection & Dev Preview

- `useIsMobile()` gains a `?view=` override: `?view=mobile` or `?view=desktop`
  forces the experience regardless of the media query (for previewing on a
  desktop machine). Absent → today's media-query behaviour.
- `package.json` scripts:
  - `dev` — unchanged (device-based).
  - `dev:mobile` / `dev:desktop` — open the browser at `?view=…` for quick preview.
- One production `build` serves both; no second build/deploy.

## 7. PWA (Android installability)

Foundation already present and unchanged: `manifest.webmanifest` (`display:
standalone`, `id/scope/start_url: "./"`, icons 192/512/maskable), minimal `sw.js`
(no-op fetch handler for the install prompt), `base: './'`, apple-touch tags. The
refactor does not touch these. Android/Chrome installs → `start_url "./"` → `App`
→ device switch → **mobile experience** (the loved deck). **Verify** installability
post-refactor (manifest served, SW registers over HTTPS, install criteria met).

## 8. Testing & Verification

- **Unit (vitest):**
  - `useIsMobile` `?view=` override (mobile/desktop/absent).
  - Progress computation (rendered/total) and skeleton→thumbnail transition logic.
  - Existing `cards.smoke` + `i18n.coverage` stay green (untouched).
- **Lint/build:** `npm run lint` + `npm run build` clean (build is the guardrail
  for the large R3F removal).
- **Headless (Playwright):**
  - Desktop (~1440×900): gallery only, aubergine backdrop, skeletons then
    thumbnails, progress bar, **no loader**, no console errors; category switch
    shifts backdrop mood.
  - Mobile (~390×844): loader + deck **identical** to today.
  - PWA: manifest + SW present, install criteria (Lighthouse/`beforeinstallprompt`).

## 9. Risks & Mitigations

- **Large deletion (R3F scene).** Do it in one focused pass with `build` + tests as
  guardrails; dependency removal only after a clean grep for `three`/R3F.
- **Dev-tool → product gap.** The gallery was a review tool; audit toolbar copy,
  keyboard handling, and empty/loading states for production polish.
- **Thumbnail load cost.** ~227 canvases; keep the staggered render + size slider
  smooth. Skeletons + progress make the wait legible; verify no jank at load.
- **Backdrop tuning.** Aubergine drift + per-category tint is aesthetic; tune on a
  screenshot after a conservative first pass.

## 10. Success Criteria

- Desktop: gallery only, no loader, aubergine drifting backdrop with per-category
  mood, skeletons + progress; desktop chunk free of `three`/R3F.
- Mobile/tablet: byte-for-behaviour identical to today (loader + deck + enlarged
  icons).
- PWA installable on Android (verified).
- `lint` + `build` + `test` green; both surfaces headless-verified.
