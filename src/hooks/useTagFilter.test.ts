import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTagFilter } from './useTagFilter';

// Valid tag ids (see TAGS in dashboards/index): 'geld' is the default, 'krieg'
// and 'welt' are other known ids used here as the "switch to" targets.
const DEFAULT = 'geld';
const TAG_KEY = 'worldpulse-tag';

function setSearch(search: string): void {
  window.history.replaceState(null, '', search ? `/?${search}` : '/');
}

beforeEach(() => {
  setSearch(''); // localStorage is cleared by the global setup
});

afterEach(() => {
  cleanup();
});

describe('useTagFilter', () => {
  it('falls back to the default when nothing is stored or in the URL', () => {
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    expect(result.current[0]).toBe(DEFAULT);
  });

  it('initializes from a valid ?filter= param', () => {
    setSearch('filter=krieg');
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    expect(result.current[0]).toBe('krieg');
  });

  it('initializes from the stored tag when there is no param', () => {
    localStorage.setItem(TAG_KEY, 'welt');
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    expect(result.current[0]).toBe('welt');
  });

  it('lets the URL param win over stored state', () => {
    localStorage.setItem(TAG_KEY, 'welt');
    setSearch('filter=krieg');
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    expect(result.current[0]).toBe('krieg');
  });

  it('ignores an unknown param and the legacy "all" sentinel', () => {
    setSearch('filter=does-not-exist');
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    expect(result.current[0]).toBe(DEFAULT);

    cleanup();
    setSearch('');
    localStorage.setItem(TAG_KEY, 'all'); // legacy value in returning visitors' storage
    const second = renderHook(() => useTagFilter(DEFAULT));
    expect(second.result.current[0]).toBe(DEFAULT);
  });

  it('mirrors a change into both the URL and localStorage', () => {
    const { result } = renderHook(() => useTagFilter(DEFAULT));
    act(() => result.current[1]('krieg'));
    expect(result.current[0]).toBe('krieg');
    expect(new URLSearchParams(window.location.search).get('filter')).toBe('krieg');
    expect(localStorage.getItem(TAG_KEY)).toBe('krieg');
  });
});
