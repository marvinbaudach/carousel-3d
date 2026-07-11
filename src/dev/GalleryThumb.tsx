// Dev-only review gallery — one card tile: a canvas thumbnail drawn by the
// shared engine, plus a caption (#index · id · category chip · added date).
// Memoized so filtering/reordering the grid doesn't redraw untouched tiles;
// the canvas repaints only when its size or the redraw token (locale switch,
// live-data landing) changes.

import { memo, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { drawCard, type CardEntry, type Category } from './galleryData';
import { ACCENT, ACCENT_RGB, INK, DIM } from './galleryChrome';

interface GalleryThumbProps {
  entry: CardEntry;
  category: Category | undefined;
  /** Thumbnail width in CSS px (grid column width). */
  width: number;
  /** Thumbnail height in CSS px. */
  height: number;
  /** Bumped on locale switch / live-data update to force a repaint. */
  redrawToken: string;
  onOpen: (entry: CardEntry) => void;
  onContextMenu: (entry: CardEntry, x: number, y: number) => void;
}

const Figure = styled.figure<{ $w: number; $h: number }>`
  margin: 0;
  cursor: pointer;
  outline: none;
  /* Skip layout/paint for tiles scrolled out of view; the intrinsic size (tile
     width + caption) keeps the scrollbar stable until each row first renders. */
  content-visibility: auto;
  contain-intrinsic-size: auto ${(p) => p.$w}px auto ${(p) => p.$h + 54}px;

  canvas {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    background: #000;
    box-shadow:
      0 8px 24px -12px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease;
  }
  /* Hover lights the tile rather than moving it — accent rim + globe-blue glow
     over a deepened drop, so it lifts off the grid. */
  &:hover canvas {
    border-color: ${ACCENT};
    box-shadow:
      0 0 0 1px rgba(${ACCENT_RGB}, 0.45),
      0 12px 30px -10px rgba(0, 0, 0, 0.6),
      0 0 28px rgba(${ACCENT_RGB}, 0.36);
  }
  &:focus-visible canvas {
    border-color: ${ACCENT};
    box-shadow:
      0 0 0 2px rgba(${ACCENT_RGB}, 0.6),
      0 0 28px rgba(${ACCENT_RGB}, 0.36);
  }
`;

const Caption = styled.figcaption`
  padding: 6px 2px 0;
  font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;

  .top {
    color: ${INK};
    word-break: break-all;
  }
  .idx {
    color: ${DIM};
  }
  .meta {
    margin-top: 4px;
    display: flex;
    gap: 8px;
    align-items: center;
    color: ${DIM};
  }
  .chip {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: #05070c;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 1px 3px rgba(0, 0, 0, 0.35);
  }
`;

function GalleryThumbImpl({
  entry,
  category,
  width,
  height,
  redrawToken,
  onOpen,
  onContextMenu,
}: GalleryThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  // Draw lazily: a tile rasterises its canvas only once it nears the viewport,
  // so opening the grid paints the visible rows instead of the whole pool at
  // once. rootMargin gives a screen of lead time so tiles are ready before they
  // scroll in.
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: '400px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Paint while on-screen. The drawn signature is remembered so scrolling a tile
  // out and back doesn't repaint (and flash) an unchanged canvas; a locale
  // switch or resize changes the signature, so on-screen tiles repaint while
  // off-screen ones stay stale until they return.
  const drawnKey = useRef('');
  useEffect(() => {
    if (!onScreen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const key = `${entry.card.id}|${width}|${height}|${redrawToken}`;
    if (drawnKey.current === key) return;
    drawCard(canvas, entry.card, width, height);
    drawnKey.current = key;
  }, [onScreen, entry.card, width, height, redrawToken]);

  return (
    <Figure
      ref={figureRef}
      $w={width}
      $h={height}
      tabIndex={0}
      role="button"
      aria-label={`${entry.card.id} öffnen`}
      onClick={() => onOpen(entry)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(entry, e.clientX, e.clientY);
      }}
    >
      <canvas ref={canvasRef} />
      <Caption>
        <div className="top">
          <span className="idx">#{entry.idx} </span>
          {entry.card.id}
        </div>
        <div className="meta">
          {category && (
            <span className="chip" style={{ background: category.accent }}>
              {category.label.toLowerCase()}
            </span>
          )}
          <span>{entry.card.added ? entry.card.added.slice(0, 10) : '—'}</span>
        </div>
      </Caption>
    </Figure>
  );
}

export const GalleryThumb = memo(GalleryThumbImpl);
