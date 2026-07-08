# Favorites Stack — Design

Date: 2026-07-08
Status: approved

## Goal

Users can mark dashboard cards as favorites and view them as their own deck
("FAVORITEN"), on both the mobile swipe deck and the desktop 3D ring. The
favorites set persists across visits on the same device.

## Approach

Favorites are a **dynamic pseudo-tag** layered into the existing theme/filter
system (chips + `useTagFilter`). No new navigation surface: the FAVORITEN chip
behaves like any other theme chip, except its card list comes from a runtime
store instead of the static pool clustering.

Rejected alternatives: a dedicated favorites view outside the tag system
(second navigation concept, YAGNI) and pin-within-theme (no own stack).

## Components

### 1. Favorites store — `src/favorites.ts`

- Persists an array of card ids (insertion order) under the localStorage key
  `worldpulse-favorites`.
- API: `getFavorites(): string[]`, `isFavorite(id): boolean`,
  `toggleFavorite(id): void`, `onFavoritesChange(cb): unsubscribe` — same tiny
  pub/sub shape as `data/store.ts`.
- React binding: `useFavorites()` hook via `useSyncExternalStore`.
- On load, ids that no longer exist in the pool are dropped (cards get removed
  from `POOL` over time).
- Storage writes are wrapped in try/catch (private-mode Safari), state still
  updates in memory on failure.

### 2. Tag + chip

- New tag id `favoriten`, label `FAVORITEN`. The categorical palette is fixed
  (CVD-validated, never extended by hand), so it shares a `SERIES` slot like
  TECH does — the slot closest to gold/amber, matching the star.
- The chip renders **only when at least one favorite exists**: mobile filter
  sheet and desktop theme bar both hide it when empty.
- When the active filter is `favoriten` and the last favorite is removed, the
  view falls back to `TAGS[0]`. `useTagFilter` applies the same validation to
  the persisted URL/localStorage value on load.

### 3. Star toggle on the card

- Mobile: a glass-surface ★ button overlaid top-right on the **active**
  SwipeDeck card (DOM overlay, outside the canvas texture — no redraws).
  Tapping toggles with `hapticTick()`; filled vs. outlined communicates state.
  The button must not swallow swipe gestures (it is small, and pointer events
  on it do not start a drag).
- Desktop: a ★ action in the hero / dressed card state of `Carousel3D`, next
  to the existing card actions.
- Accessible label: „Zu Favoriten" / „Favorit entfernen" (aria-pressed).

### 4. Deck / ring assembly

- Mobile (`MobileDeck`): `tag === 'favoriten'` → favorites list in insertion
  order, **uncapped** (mobile has no stack limit by design).
- Desktop (`Carousel3D`): the favorites ring cannot come from the static
  `RING_BY_TAG` (it changes at runtime); it is computed dynamically from the
  store and capped at `RING_MAX` like every other theme.

### 5. i18n

New German source strings with en/fr/it entries: `FAVORITEN`,
`Zu Favoriten`, `Favorit entfernen` (plus any hint copy added during
implementation). Missing keys fall through to German per existing i18n rules.

## Error handling

- localStorage unavailable/full → favorites work in-memory for the session.
- Stale ids → filtered on read.
- Empty favorites while filter active → fall back to `TAGS[0]` (no empty-state
  card needed, chip disappears).

## Verification

The repo has no test framework (CI = oxlint + type-checked build). Gate on:

1. `npm run lint` and `npm run build` pass.
2. Browser QA, mobile viewport: star a card → chip appears → switch to
   FAVORITEN → swipe the stack → unstar down to zero → fallback to default
   theme, chip disappears, no crash.
3. Browser QA, desktop: star in hero state, FAVORITEN ring renders, survives
   reload (persistence).
