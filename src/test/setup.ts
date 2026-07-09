// Guarantee a working Web Storage in the test environment. Node 26 gates its
// built-in localStorage behind --localstorage-file, and jsdom 29 does not expose
// one as a global here, so the store-backed modules (i18n locale, favorites,
// data cache, the tag-filter hook) would hit an undefined `localStorage`. A
// minimal in-memory Storage keeps them deterministic and framework-independent.

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function ensureStorage(name: 'localStorage' | 'sessionStorage'): void {
  try {
    const existing = (globalThis as Record<string, unknown>)[name] as Storage | undefined;
    if (existing && typeof existing.setItem === 'function') {
      existing.setItem('__probe__', '1');
      existing.removeItem('__probe__');
      return; // A real, writable storage is already present.
    }
  } catch {
    // Present but throwing (e.g. Node's gated built-in) — replace it below.
  }
  const value = new MemoryStorage();
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch {
    (globalThis as Record<string, unknown>)[name] = value;
  }
}

ensureStorage('localStorage');
ensureStorage('sessionStorage');

// A clean slate per test for the store-backed modules. Module-level singletons
// (the i18n LOCALE var, the favorites list) are reset where it matters via
// vi.resetModules() inside those files; this just clears the persisted layer.
import { beforeEach } from 'vitest';
beforeEach(() => {
  localStorage.clear();
});
