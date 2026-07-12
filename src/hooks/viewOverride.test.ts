import { afterEach, describe, expect, it, vi } from 'vitest';
import { readViewOverride } from './viewOverride';

function setSearch(search: string): void {
  vi.stubGlobal('window', { location: { search } } as unknown as Window);
}

afterEach(() => vi.unstubAllGlobals());

describe('readViewOverride', () => {
  it('returns null with no param', () => {
    setSearch('');
    expect(readViewOverride()).toBeNull();
  });
  it('reads view=mobile', () => {
    setSearch('?view=mobile');
    expect(readViewOverride()).toBe('mobile');
  });
  it('reads view=desktop', () => {
    setSearch('?view=desktop&foo=1');
    expect(readViewOverride()).toBe('desktop');
  });
  it('ignores unknown values', () => {
    setSearch('?view=watch');
    expect(readViewOverride()).toBeNull();
  });
});
