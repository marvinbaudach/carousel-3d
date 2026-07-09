import { describe, it, expect, vi } from 'vitest';

// The favorites store is a module-level singleton seeded from localStorage at
// import time, so each test re-imports it fresh (after seeding storage) to get
// true isolation. resetModules() clears the registry; globals like localStorage
// survive it, which is exactly what we want. The module type is inferred from
// the dynamic import — no explicit alias needed.
const KEY = 'worldpulse-favorites';
// Long-lived core card ids — the guard test below fails loudly if either is renamed.
const A = 'us-debt';
const B = 'military';

async function load(seed?: string[]) {
  localStorage.clear();
  vi.resetModules();
  if (seed) localStorage.setItem(KEY, JSON.stringify(seed));
  return import('./favorites');
}

describe('favorites store', () => {
  it('uses real card ids (guard against renames)', async () => {
    const { DASHBOARDS_BY_ID } = await import('./dashboards');
    expect(DASHBOARDS_BY_ID[A]).toBeDefined();
    expect(DASHBOARDS_BY_ID[B]).toBeDefined();
  });

  it('starts empty with no stored data', async () => {
    const fav = await load();
    expect(fav.getFavorites()).toEqual([]);
  });

  it('toggles an id on and back off', async () => {
    const fav = await load();
    fav.toggleFavorite(A);
    expect(fav.isFavorite(A)).toBe(true);
    expect(fav.getFavorites()).toEqual([A]);
    fav.toggleFavorite(A);
    expect(fav.isFavorite(A)).toBe(false);
    expect(fav.getFavorites()).toEqual([]);
  });

  it('preserves starring order (newest appended)', async () => {
    const fav = await load();
    fav.toggleFavorite(B);
    fav.toggleFavorite(A);
    expect(fav.getFavorites()).toEqual([B, A]);
  });

  it('drops ids of cards that have left the pool on load', async () => {
    const fav = await load([A, '__ghost__']);
    expect(fav.getFavorites()).toEqual([A]);
  });

  it('ignores a corrupt stored value', async () => {
    localStorage.clear();
    vi.resetModules();
    localStorage.setItem(KEY, 'not json');
    const fav = await import('./favorites');
    expect(fav.getFavorites()).toEqual([]);
  });

  it('persists toggles to localStorage and reloads them', async () => {
    const fav = await load();
    fav.toggleFavorite(A);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toEqual([A]);

    // A fresh import (storage kept) restores the stars.
    vi.resetModules();
    const reloaded = await import('./favorites');
    expect(reloaded.getFavorites()).toEqual([A]);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const fav = await load();
    const spy = vi.fn();
    const off = fav.onFavoritesChange(spy);
    fav.toggleFavorite(A);
    expect(spy).toHaveBeenCalledTimes(1);
    off();
    fav.toggleFavorite(B);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  describe('favoriteDashboards', () => {
    it('returns the starred cards as dashboards in order', async () => {
      const fav = await load([B, A]);
      expect(fav.favoriteDashboards().map((d) => d.id)).toEqual([B, A]);
    });

    it('respects the limit', async () => {
      const fav = await load([B, A]);
      expect(fav.favoriteDashboards(1).map((d) => d.id)).toEqual([B]);
    });

    it('silently drops ids with no matching card', async () => {
      const fav = await load();
      fav.toggleFavorite(B);
      fav.toggleFavorite('__ghost__'); // toggle does not validate...
      expect(fav.getFavorites()).toEqual([B, '__ghost__']);
      // ...but the dashboard snapshot filters the unknown id out.
      expect(fav.favoriteDashboards().map((d) => d.id)).toEqual([B]);
    });
  });
});
