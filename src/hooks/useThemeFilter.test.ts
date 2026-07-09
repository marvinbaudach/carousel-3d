import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useThemeFilter, DEFAULT_TAG } from './useThemeFilter';
import { getFavorites, toggleFavorite } from '../favorites';

const FAV = 'us-debt'; // a real, long-lived card id

// The favorites store is a module singleton shared with the hook — drain it
// after each test so stars don't leak across cases. resetModules is off-limits
// here: it would give the hook and this file different store instances.
function drainFavorites(): void {
  // Iterating the live array is safe: toggleFavorite reassigns the module's
  // list to a new array rather than mutating the one this loop walks.
  for (const id of getFavorites()) toggleFavorite(id);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  drainFavorites();
});

afterEach(() => {
  cleanup();
  drainFavorites();
});

describe('useThemeFilter', () => {
  it('defaults to the first tag and hides FAVORITEN with no stars', () => {
    const { result } = renderHook(() => useThemeFilter());
    expect(result.current.tag).toBe(DEFAULT_TAG);
    expect(result.current.visibleTags.some((t) => t.id === 'favoriten')).toBe(false);
  });

  it('reveals the FAVORITEN chip once a card is starred', () => {
    const { result } = renderHook(() => useThemeFilter());
    expect(result.current.visibleTags.some((t) => t.id === 'favoriten')).toBe(false);
    act(() => toggleFavorite(FAV));
    expect(result.current.visibleTags.some((t) => t.id === 'favoriten')).toBe(true);
  });

  it('glides back to the default tag when the last star is removed', () => {
    const { result } = renderHook(() => useThemeFilter());
    act(() => toggleFavorite(FAV));
    act(() => result.current.setTag('favoriten'));
    expect(result.current.tag).toBe('favoriten');

    act(() => toggleFavorite(FAV)); // remove the last star
    expect(result.current.tag).toBe(DEFAULT_TAG);
  });
});
