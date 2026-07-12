// The desktop gallery's backdrop: an Ubuntu-aubergine gradient mesh that
// flows like a slow lava lamp, with a per-category accent bloom in the
// top-right. Pure CSS — no WebGL ships to the desktop chunk.
//
// Fluidity comes from RELATIVE motion: each colour bloom rides its own
// oversized layer on its own closed multi-waypoint path with its own period
// (42s/56s/70s — deliberately non-harmonic so the constellation never
// visibly repeats). A single sheet of gradients sliding together reads as
// mechanical; blooms overtaking and parting from each other read as liquid.
//
// Compositor discipline: each gradient is painted ONCE onto its layer and
// the flow animates `transform` (translate3d/scale/rotate) and `opacity`
// only — never `background-position`, which would re-rasterize the
// full-viewport gradient every frame. The slight rotation matters: the
// gradients are elliptical, so rotating them morphs the bloom's silhouette
// without any repaint. The accent mood change is a real cross-fade via
// mount-time `opacity` keyframes (a transition on a custom property inside
// a gradient would snap — not animatable without @property): the incoming
// bloom fades in while the outgoing layer, kept mounted for the fade's
// duration, fades out.

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AUBERGINE } from './galleryChrome';

// Oversize the drifting layers past every viewport edge so the translate
// drift never exposes a blank border.
const BLEED = '-20%';
const FADE_MS = 600;

const Viewport = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: ${AUBERGINE.ground2}; /* paints the frame before the layers mount */
`;

// The near-black ground stays put; everything above it flows.
const Ground = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    150deg,
    ${AUBERGINE.ground0},
    ${AUBERGINE.ground1} 55%,
    ${AUBERGINE.ground2}
  );
`;

// Shared skeleton for the free-floating colour blooms. Path keyframes live on
// the concrete blobs below — each needs its own uniquely named loop.
const Blob = styled.div`
  position: absolute;
  inset: ${BLEED};
  will-change: transform, opacity;
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

// Bright magenta bloom, upper left. Closed loop (last frame = first) so the
// motion never ping-pongs; per-segment ease-in-out gives it a breathing gait.
const BloomBlob = styled(Blob)`
  background: radial-gradient(
    60% 80% at 18% 12%,
    ${AUBERGINE.bloom},
    transparent 55%
  );
  animation: aubergine-bloom-flow 42s ease-in-out infinite;
  @keyframes aubergine-bloom-flow {
    0%,
    100% {
      transform: translate3d(-5%, -3%, 0) rotate(0deg) scale(1);
      opacity: 0.9;
    }
    25% {
      transform: translate3d(3%, 2%, 0) rotate(4deg) scale(1.12);
      opacity: 1;
    }
    50% {
      transform: translate3d(7%, -2%, 0) rotate(-2deg) scale(1.04);
      opacity: 0.85;
    }
    75% {
      transform: translate3d(-1%, 4%, 0) rotate(3deg) scale(1.15);
      opacity: 1;
    }
  }
`;

// Plum bloom, upper right — counter-phased against the magenta so the two
// approach and part instead of travelling in formation.
const PlumBlob = styled(Blob)`
  background: radial-gradient(
    55% 70% at 88% 22%,
    ${AUBERGINE.plum},
    transparent 60%
  );
  animation: aubergine-plum-flow 56s ease-in-out infinite;
  @keyframes aubergine-plum-flow {
    0%,
    100% {
      transform: translate3d(4%, 3%, 0) rotate(0deg) scale(1.05);
      opacity: 1;
    }
    25% {
      transform: translate3d(-4%, -2%, 0) rotate(-4deg) scale(1);
      opacity: 0.85;
    }
    50% {
      transform: translate3d(-7%, 4%, 0) rotate(2deg) scale(1.14);
      opacity: 1;
    }
    75% {
      transform: translate3d(2%, -4%, 0) rotate(-3deg) scale(1.02);
      opacity: 0.9;
    }
  }
`;

// Deep violet ground-swell along the bottom — the slowest layer, so the
// lower half of the frame stays calm while the top breathes.
const DeepBlob = styled(Blob)`
  background: radial-gradient(
    70% 90% at 72% 100%,
    ${AUBERGINE.deep},
    transparent 60%
  );
  animation: aubergine-deep-flow 70s ease-in-out infinite;
  @keyframes aubergine-deep-flow {
    0%,
    100% {
      transform: translate3d(0%, 2%, 0) rotate(0deg) scale(1);
      opacity: 1;
    }
    33% {
      transform: translate3d(-6%, -2%, 0) rotate(3deg) scale(1.1);
      opacity: 0.88;
    }
    66% {
      transform: translate3d(5%, 0%, 0) rotate(-3deg) scale(1.05);
      opacity: 1;
    }
  }
`;

// One accent bloom per accent value, flowing on its own closed loop so the
// mood tint takes part in the liquid motion. Fades run as mount-time
// keyframes (`forwards` pins the end state), so they replay reliably when a
// layer (re)mounts.
const AccentBloom = styled.div<{ $accent: string; $out: boolean }>`
  position: absolute;
  inset: ${BLEED};
  background: radial-gradient(
    50% 65% at 84% 16%,
    color-mix(in oklab, ${(p) => p.$accent} 40%, transparent),
    transparent 60%
  );
  animation:
    ${(p) => (p.$out ? 'bloom-out' : 'bloom-in')} ${FADE_MS}ms ease forwards,
    accent-flow 48s ease-in-out infinite;
  will-change: transform, opacity;
  @keyframes accent-flow {
    0%,
    100% {
      transform: translate3d(3%, -3%, 0) rotate(0deg) scale(1.04);
    }
    33% {
      transform: translate3d(-3%, 3%, 0) rotate(-3deg) scale(1);
    }
    66% {
      transform: translate3d(-5%, -1%, 0) rotate(2deg) scale(1.1);
    }
  }
  @keyframes bloom-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes bloom-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: ${(p) => (p.$out ? 0 : 1)};
  }
`;

export function AubergineBackdrop({ accent }: { accent: string }) {
  // The previously shown accent, kept mounted (fading out) for FADE_MS after a
  // category switch so the mood cross-fades instead of snapping.
  const [prev, setPrev] = useState(accent);
  useEffect(() => {
    if (prev === accent) return;
    const id = window.setTimeout(() => setPrev(accent), FADE_MS + 50);
    return () => window.clearTimeout(id);
  }, [prev, accent]);

  return (
    <Viewport aria-hidden>
      <Ground />
      <DeepBlob />
      <PlumBlob />
      <BloomBlob />
      {prev !== accent && <AccentBloom key={prev} $accent={prev} $out />}
      <AccentBloom key={accent} $accent={accent} $out={false} />
    </Viewport>
  );
}
