// Dev-only review gallery, embedded in the app as a single-page view: the card
// grid, lightbox, filters and live-data controls, rendered over the app's own
// Aurora starfield in frosted glass so it reads as one piece with the ring.
//
// It stays mounted (in dev, desktop) once opened, so toggling between the ring
// and the gallery is smooth and lossless in both directions — `active` only
// flips visibility (a crossfade) and freezes the backdrop. The heavy content
// (backdrop context + ~200 thumbnail canvases) is deferred until the first open
// so a dev who never opens the gallery pays nothing at boot.
//
// Never ships: App loads this module only under import.meta.env.DEV via a
// dead-code-eliminated dynamic import.

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { onLiveUpdate } from '../../data/store';
import { LOCALE, onLocaleChange, setLocale, type Locale } from '../../i18n';
import {
  buildEntries,
  filterSort,
  CATEGORIES,
  type CardEntry,
  type Category,
} from './galleryData';
import { ACCENT } from './galleryChrome';
import { GalleryToolbar, type CategoryOption } from './GalleryToolbar';
import { GalleryGrid } from './GalleryGrid';
import { GalleryLightbox } from './GalleryLightbox';
import { GalleryCardMenu, GalleryToast, type CardMenuState } from './GalleryCardMenu';

interface GalleryProps {
  onThumbRendered?: (id: string) => void;
  onAccentChange?: (accent: string) => void;
}

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1;
  color-scheme: dark;
`;

const Scroll = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
`;

const FULL_RATIO = 960 / 768;
const TOAST_MS = 1400;

export default function Gallery({ onThumbRendered, onAccentChange }: GalleryProps) {
  const entries = useMemo(() => buildEntries(), []);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState('');
  const [size, setSize] = useState(300);

  const [locale, setLoc] = useState<Locale>(LOCALE);
  useEffect(() => onLocaleChange(setLoc), []);
  const onLocale = useCallback((l: Locale) => void setLocale(l), []);

  // A repaint token: locale switches and (coalesced) live-data updates bump it,
  // and every mounted thumbnail + the lightbox redraw when it changes.
  const [redrawTick, setRedrawTick] = useState(0);
  useEffect(() => {
    let queued = false;
    return onLiveUpdate(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        setRedrawTick((t) => t + 1);
      });
    });
  }, []);
  const redrawToken = `${locale}:${redrawTick}`;

  const list = useMemo(
    () => filterSort(entries, { query: deferredQuery, category, sort: 'newest' }),
    [entries, deferredQuery, category],
  );

  const categories = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.primaryTag, (counts.get(e.primaryTag) ?? 0) + 1);
    const opts: CategoryOption[] = [{ value: '', label: 'alle', count: entries.length }];
    for (const [id, cat] of CATEGORIES) {
      const n = counts.get(id);
      if (n) opts.push({ value: id, label: cat.label.toLowerCase(), count: n });
    }
    return opts;
  }, [entries]);

  const categoryOf = useCallback((tag: string): Category | undefined => CATEGORIES.get(tag), []);
  const accent = (category && CATEGORIES.get(category)?.accent) || ACCENT;
  useEffect(() => onAccentChange?.(accent), [accent, onAccentChange]);

  // Lightbox: an index into the current filtered list (null = closed).
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const openCard = useCallback((entry: CardEntry) => setLbIndex(list.indexOf(entry)), [list]);
  const navigate = useCallback(
    (delta: number) =>
      setLbIndex((i) => (i === null ? i : (i + delta + list.length) % list.length)),
    [list.length],
  );
  const closeLightbox = useCallback(() => setLbIndex(null), []);
  // Filtering can shrink the list under an open lightbox — keep the index valid.
  useEffect(() => {
    setLbIndex((i) => (i !== null && i >= list.length ? (list.length ? list.length - 1 : null) : i));
  }, [list.length]);

  const [menu, setMenu] = useState<CardMenuState | null>(null);
  const openMenu = useCallback(
    (entry: CardEntry, x: number, y: number) => setMenu({ card: entry.card, x, y }),
    [],
  );
  const closeMenu = useCallback(() => setMenu(null), []);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const height = Math.round(size * FULL_RATIO);

  // App only mounts this component on first open (behind a dev-gated lazy
  // import), so there's nothing to defer here — everything below is live from
  // the first paint, and stays mounted for lossless re-toggling.
  return (
    <Root>
      <Scroll>
        <GalleryToolbar
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          categories={categories}
          size={size}
          onSize={setSize}
          locale={locale}
          onLocale={onLocale}
          count={list.length}
        />
        <GalleryGrid
          list={list}
          width={size}
          height={height}
          redrawToken={redrawToken}
          categoryOf={categoryOf}
          keyboardActive={lbIndex === null}
          onOpen={openCard}
          onContextMenu={openMenu}
          onRendered={onThumbRendered}
        />
      </Scroll>
      {lbIndex !== null && list.length > 0 && (
        <GalleryLightbox
          list={list}
          index={Math.min(lbIndex, list.length - 1)}
          redrawToken={redrawToken}
          categoryOf={categoryOf}
          onClose={closeLightbox}
          onNavigate={navigate}
        />
      )}
      {menu && <GalleryCardMenu menu={menu} onClose={closeMenu} onToast={setToast} />}
      {toast && <GalleryToast message={toast} />}
    </Root>
  );
}
