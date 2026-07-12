export type ViewOverride = 'mobile' | 'desktop';

/** Force a specific experience for previewing, regardless of the device. */
export function readViewOverride(): ViewOverride | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('view');
  return value === 'mobile' || value === 'desktop' ? value : null;
}
