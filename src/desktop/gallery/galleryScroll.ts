// Tiny scroll bus between the gallery's scroll container and the backdrop
// (they are siblings under DesktopApp). Same subscription pattern as
// data/store's onLiveUpdate: publish is a direct fan-out, subscribers do
// their own rAF coalescing and write to the DOM directly — scroll position
// never touches React state.

type ScrollListener = (y: number) => void;

const listeners = new Set<ScrollListener>();
let lastY = 0;

export function publishGalleryScroll(y: number): void {
  lastY = y;
  for (const listener of listeners) listener(y);
}

/** Subscribe to gallery scroll; fires immediately with the latest position.
    Returns the unsubscribe function. */
export function onGalleryScroll(listener: ScrollListener): () => void {
  listener(lastY);
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
