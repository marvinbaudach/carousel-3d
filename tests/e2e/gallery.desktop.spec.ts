import { test, expect, type Page } from '@playwright/test';
import { bootWithLocale } from './helpers';

// Desktop dev gallery open/close transition (App <-> DevGallery). The gallery is
// a dev-only, desktop-only single-page view that fades in over the WebGL ring;
// both views stay mounted so toggling between them is lossless. This guards the
// round-trip the crossfade exists for — ring -> gallery -> back -> and open
// again — asserting the second open still shows tiles (nothing is torn down on
// close). "Der Übergang hin und zurück" is the whole point of the spec.
//
// Firefox-only (see playwright.config.ts): the desktop view mounts the full
// WebGL ring, which starves headless Chromium's software GL. The first
// interaction of each test carries the ~13s headless boot wait via the 30s
// actionTimeout — the loading screen sits on top with pointer-events until the
// ring is ready, so the launcher click only lands once the gallery can mount.

// The ⧉ Gallery launcher in the ring overlay (accessible name is its aria-label;
// App unmounts it while the gallery is open).
const galleryLink = (page: Page) => page.getByRole('button', { name: /Karten-Galerie öffnen/ });

// The "← App" back button in the gallery toolbar (aria-label "Zurück zur App").
const backButton = (page: Page) => page.getByRole('button', { name: 'Zurück zur App' });

// Any gallery card tile — a <figure role="button" aria-label="<id> öffnen">. The
// launcher's label ends in "(Dev)", so the trailing anchor keeps them apart.
const anyTile = (page: Page) => page.getByRole('button', { name: /öffnen$/ }).first();

// The toolbar's live card count, e.g. "223 Karten" — text unique to the gallery.
const cardCount = (page: Page) => page.getByText(/\d+ Karten/);

test.describe('desktop dev gallery transition', () => {
  test('opens from the ring view and hides the ring overlay', async ({ page }) => {
    await bootWithLocale(page, 'de');

    // Booted ring view: the gallery has never mounted, so its back button is
    // absent. (The launcher's own presence is asserted by the click below, whose
    // 30s actionTimeout waits out the loader-covered boot.)
    await expect(backButton(page)).toBeHidden();

    await galleryLink(page).click();

    // The gallery view is up: back button, count and at least one tile render...
    await expect(backButton(page)).toBeVisible();
    await expect(cardCount(page)).toBeVisible();
    await expect(anyTile(page)).toBeVisible();

    // ...and the ring's own overlay controls are gone while it's open (App drops
    // both DevGalleryLink and PerfHud from the tree when showGallery is true).
    await expect(galleryLink(page)).toBeHidden();
  });

  test('the "← App" back button returns to the ring view', async ({ page }) => {
    await bootWithLocale(page, 'de');

    await galleryLink(page).click();
    await expect(backButton(page)).toBeVisible();

    await backButton(page).click();

    // Ring overlay returns (launcher remounts) and the gallery is hidden again.
    await expect(galleryLink(page)).toBeVisible();
    await expect(backButton(page)).toBeHidden();
  });

  test('round-trips ring -> gallery -> ring -> gallery, still showing tiles', async ({ page }) => {
    await bootWithLocale(page, 'de');

    // Open (first time).
    await galleryLink(page).click();
    await expect(backButton(page)).toBeVisible();
    await expect(anyTile(page)).toBeVisible();

    // Close — back to the ring view.
    await backButton(page).click();
    await expect(galleryLink(page)).toBeVisible();
    await expect(backButton(page)).toBeHidden();

    // Reopen: the gallery stayed mounted, so it comes straight back with its
    // tiles and count intact — the lossless re-toggle the crossfade is built for.
    await galleryLink(page).click();
    await expect(backButton(page)).toBeVisible();
    await expect(anyTile(page)).toBeVisible();
    await expect(cardCount(page)).toBeVisible();
  });
});
