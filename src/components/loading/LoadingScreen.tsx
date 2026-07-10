import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { LIVE_FEEDS, feedStates, feedsSettled, type FeedState } from '../../data/sources';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CONVERGE_MS, MONO } from './loaderConstants';
import { progressTarget } from './loaderMath';
import { useLoaderGlobe } from './useLoaderGlobe';
import { FeedStrip } from './FeedStrip';

interface LoadingScreenProps {
  done: boolean;
  onExited: () => void;
}

const FEED_TOTAL = LIVE_FEEDS.length;

// The background lights breathe slowly, so the illumination drifts.
const breathe = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.12); }
`;
// Gradient highlight sweeping through the wordmark (background-clip: text).
const sweep = keyframes`
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
`;
// One-time draw-on for the EKG pulse line under the wordmark.
const drawOn = keyframes`
  to { stroke-dashoffset: 0; }
`;
// The scanner arc orbits the progress ring; transform-only, compositor-cheap.
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
// Barely-there parallax drift for the static starfield.
const drift = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-2.5%, -1.5%, 0); }
`;
// The exit flash pumps like a body barely containing its energy: two quick
// unequal beats per cycle, more heartbeat than sine wave.
const pump = keyframes`
  0%, 100% { transform: scale(1); }
  28% { transform: scale(1.16); }
  46% { transform: scale(0.97); }
  64% { transform: scale(1.09); }
  82% { transform: scale(0.99); }
`;

// Exit: the dots implode into a swelling light at the center, and the whole
// screen dissolves into the scene — a plain fade, no circle geometry left to
// read as a second pulse.
const Screen = styled.div<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #080b14;
  opacity: ${(p) => (p.$leaving ? 0 : 1)};
  pointer-events: ${(p) => (p.$leaving ? 'none' : 'auto')};
  transition: opacity 0.8s ease;
  overflow: hidden;
`;

// The light everything implodes into: a soft radial bloom at the exact
// center, swelling up during the convergence and carried out by the fade.
// It ignites hot and reddish, then cools into the bluish white the main
// scene lives in — while pumping like a body overloaded with energy.
// Three layers so nothing fights over transform: the outer div owns the
// swell transition, the inner one the pump animation, and the color shift
// is a warm gradient fading out over the cool one beneath it.
const Flash = styled.div<{ $done: boolean }>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 90vmin;
  height: 90vmin;
  transform: translate(-50%, -50%) scale(${(p) => (p.$done ? 1 : 0.1)});
  opacity: ${(p) => (p.$done ? 1 : 0)};
  transition:
    transform ${CONVERGE_MS + 350}ms cubic-bezier(0.2, 0.7, 0.3, 1),
    opacity ${CONVERGE_MS}ms ease-out;
  pointer-events: none;
`;

const FlashPump = styled.div<{ $done: boolean }>`
  position: absolute;
  inset: 0;
  animation: ${(p) => (p.$done ? pump : 'none')} 0.55s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Cool base: the bluish white the flash settles into.
const FlashCool = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle,
    rgba(240, 246, 255, 0.85) 0%,
    rgba(144, 160, 235, 0.4) 22%,
    rgba(57, 135, 229, 0.12) 45%,
    transparent 68%
  );
`;

// Hot start: reddish-warm, fading out on top of the cool layer so the
// bloom reads as cooling from ember-red into blue-white.
const FlashHot = styled.div<{ $done: boolean }>`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle,
    rgba(255, 235, 220, 0.9) 0%,
    rgba(250, 150, 110, 0.5) 22%,
    rgba(226, 88, 66, 0.16) 45%,
    transparent 68%
  );
  opacity: ${(p) => (p.$done ? 0 : 1)};
  transition: opacity ${CONVERGE_MS + 250}ms ease-in;
`;

const Glow = styled.div<{ $x: string; $y: string; $color: string; $delay: string }>`
  position: absolute;
  width: 80vmax;
  height: 80vmax;
  left: ${(p) => p.$x};
  top: ${(p) => p.$y};
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, ${(p) => p.$color} 0%, transparent 60%);
  filter: blur(40px);
  animation: ${breathe} 9s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Painted once on mount, then only drifts via transform — zero repaint cost.
const StarCanvas = styled.canvas`
  position: absolute;
  top: -3%;
  left: -3%;
  width: 106%;
  height: 106%;
  animation: ${drift} 70s linear infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// The globe fills the screen behind the type; the iris clips it on exit.
const GlobeCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

// Progress ring hugging the globe. On done it collapses into the center in
// step with the converging dots (same duration, same ease-in feel).
// Portrait phones size against the width instead of vmin — the globe canvas
// (see the draw loop) scales the same way, so the ring keeps hugging it.
const RingWrap = styled.div<{ $done: boolean }>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 68vmin;
  height: 68vmin;

  @media (orientation: portrait) and (max-width: 640px) {
    width: 86vw;
    height: 86vw;
  }
  transform: translate(-50%, -50%) scale(${(p) => (p.$done ? 0 : 1)});
  opacity: ${(p) => (p.$done ? 0 : 1)};
  transition:
    transform ${CONVERGE_MS}ms cubic-bezier(0.55, 0, 0.7, 0.4),
    opacity ${CONVERGE_MS}ms ease-in;
  pointer-events: none;

  & > svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
`;

const ScannerSvg = styled.svg`
  animation: ${orbit} 9s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// The type collapses into the screen center together with the converging
// dots and the ring — same duration and ease — so the iris closes over an
// already-empty stage.
const Column = styled.div<{ $done: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  transform: scale(${(p) => (p.$done ? 0 : 1)});
  opacity: ${(p) => (p.$done ? 0 : 1)};
  transition:
    transform ${CONVERGE_MS}ms cubic-bezier(0.55, 0, 0.7, 0.4),
    opacity ${CONVERGE_MS}ms ease-in;
  pointer-events: none;
`;

// Gradient sweep needs background-clip, so the fill replaces text color;
// no text-shadow here (it would show through the transparent glyphs).
const Wordmark = styled.div`
  font-size: clamp(1.3rem, 4.5vw, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.5em;
  margin-left: 0.5em; /* optically recenter the tracked-out text */
  background: linear-gradient(
    100deg,
    #f4f7fb 38%,
    #bcd0ff 47%,
    #9085e9 50%,
    #bcd0ff 53%,
    #f4f7fb 62%
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ${sweep} 3.6s linear infinite;

  /* Portrait phones have height to spare and width to fill: bigger type,
     tracking trimmed so the tracked-out wordmark still fits the screen. */
  @media (orientation: portrait) and (max-width: 640px) {
    font-size: clamp(1.8rem, 7.5vw, 2.4rem);
    letter-spacing: 0.34em;
    margin-left: 0.34em;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: none;
    color: #f4f7fb;
  }
`;

// EKG heartbeat under the wordmark — draws itself on once via dashoffset.
const PulseSvg = styled.svg`
  width: min(340px, 80vw);
  height: 22px;
  overflow: visible;

  & path {
    fill: none;
    stroke: url(#wp-pulse-grad);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: ${drawOn} 1.4s cubic-bezier(0.4, 0, 0.3, 1) 0.15s forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    & path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
`;

// Empty space the globe rotates through; the type sits above, progress below.
const GlobeGap = styled.div`
  height: min(48vmin, 44vh);

  /* Match the width-scaled portrait globe (86vw ring + breathing room), so
     the type clears its top edge instead of floating over the dots. */
  @media (orientation: portrait) and (max-width: 640px) {
    height: min(100vw, 56vh);
  }
`;

// Numeric progress under the globe — portrait phones only. The ring arc gets
// thin at phone size, and the tall screen leaves the lower third empty; a
// plain tabular readout fills it with the numbers that matter: the honest
// percentage plus how many of the live sources have checked in.
const PctReadout = styled.div<{ $done: boolean }>`
  display: none;
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 10vh);
  text-align: center;
  font: 600 17px ${MONO};
  letter-spacing: 0.24em;
  color: rgba(143, 184, 236, 0.85);
  opacity: ${(p) => (p.$done ? 0 : 1)};
  transition: opacity ${CONVERGE_MS}ms ease-in;
  pointer-events: none;

  @media (orientation: portrait) and (max-width: 640px) {
    display: block;
  }
`;

const PctFeeds = styled.span`
  color: rgba(143, 184, 236, 0.5);
  font-size: 0.82em;
`;

export function LoadingScreen({ done, onExited }: LoadingScreenProps) {
  // The explosion handoff is choreographed for the desktop ring, which blooms
  // out of the flash's center. The mobile deck's first card already sits
  // there, so the burst would detonate on top of it — mobile exits with the
  // calm variant instead: globe implosion + plain fade, the card's own chart
  // fly-in is the reveal.
  const isMobile = useIsMobile();
  const [leaving, setLeaving] = useState(false);
  const [pct, setPct] = useState(0);
  const [feedSnapshot, setFeedSnapshot] = useState<FeedState[]>(() => [...feedStates]);
  const pctRef = useRef(0);
  const timeRef = useRef(0);
  const settledRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  doneRef.current = done;

  const settled = feedSnapshot.reduce((n, s) => (s === 'pending' ? n : n + 1), 0);

  // The globe canvas: built once, reads pct/done through the refs above.
  useLoaderGlobe({ canvasRef, pctRef, doneRef, onLeave: () => setLeaving(true) });

  // Starfield: painted exactly once; afterwards only the CSS drift moves it.
  useEffect(() => {
    const canvas = starRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const mag = Math.random();
      const s = 0.5 + mag * 1.3;
      // A handful of stars pick up the accent hues; the rest stay white.
      const tint = Math.random();
      ctx.fillStyle =
        tint > 0.92
          ? `rgba(144, 133, 233, ${0.3 + mag * 0.5})`
          : tint > 0.84
            ? `rgba(57, 135, 229, ${0.3 + mag * 0.5})`
            : `rgba(220, 230, 245, ${0.12 + mag * 0.45})`;
      ctx.fillRect(x, y, s, s);
    }
  }, []);

  // Honest percentage. A self-easing time baseline guarantees motion even if
  // every source fails, and settled feeds surge the target above it (see
  // progressTarget). Snaps to 100 on done. The loop also snapshots feed states
  // for the strip whenever the settled count changes — no store subscription,
  // which also catches feeds that resolved from cache before this mounted.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      timeRef.current += (100 - timeRef.current) * 0.045;
      const nowSettled = feedsSettled();
      const target = progressTarget(timeRef.current, nowSettled / FEED_TOTAL, done);
      pctRef.current += (target - pctRef.current) * (done ? 0.2 : 0.08);
      const next = Math.round(pctRef.current);
      setPct((prev) => (prev === next ? prev : next));
      if (nowSettled !== settledRef.current) {
        settledRef.current = nowSettled;
        setFeedSnapshot([...feedStates]);
      }
      if (pctRef.current < 99.6) raf = requestAnimationFrame(tick);
      else setPct(100);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  // Reduced motion has no converge animation — leave on a short timer.
  useEffect(() => {
    if (!done || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setLeaving(true), 420);
    return () => window.clearTimeout(t);
  }, [done]);

  return (
    <Screen
      $leaving={leaving}
      onTransitionEnd={(e) => {
        if (leaving && e.target === e.currentTarget) onExited();
      }}
      aria-hidden={leaving}
    >
      <Glow $x="30%" $y="32%" $color="rgba(64, 145, 240, 0.4)" $delay="0s" />
      <Glow $x="72%" $y="64%" $color="rgba(150, 140, 245, 0.32)" $delay="-3s" />
      <Glow $x="55%" $y="45%" $color="rgba(28, 170, 122, 0.18)" $delay="-6s" />

      <StarCanvas ref={starRef} aria-hidden />
      <GlobeCanvas ref={canvasRef} aria-hidden />
      {!isMobile && (
        <Flash $done={done} aria-hidden>
          <FlashPump $done={done}>
            <FlashCool />
            <FlashHot $done={done} />
          </FlashPump>
        </Flash>
      )}

      {/* Progress ring around the globe: track, percentage arc, scanner. */}
      <RingWrap $done={done} aria-hidden>
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="wp-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3987e5" />
              <stop offset="100%" stopColor="#9085e9" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="0.3"
          />
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="url(#wp-ring-grad)"
            strokeWidth="0.45"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} ${100 - pct}`}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.25s linear' }}
          />
        </svg>
        <ScannerSvg viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(188, 208, 255, 0.5)"
            strokeWidth="0.3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="4 96"
          />
        </ScannerSvg>
      </RingWrap>

      {isMobile ? (
        <PctReadout $done={done}>
          {pct} % <PctFeeds>· {settled}/{FEED_TOTAL}</PctFeeds>
        </PctReadout>
      ) : (
        <FeedStrip states={feedSnapshot} done={done} />
      )}

      <Column $done={done}>
        <Wordmark>WORLDPULSE</Wordmark>
        <PulseSvg viewBox="0 0 340 22" aria-hidden>
          <defs>
            <linearGradient id="wp-pulse-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(57, 135, 229, 0)" />
              <stop offset="18%" stopColor="#3987e5" />
              <stop offset="55%" stopColor="#9085e9" />
              <stop offset="82%" stopColor="#3987e5" />
              <stop offset="100%" stopColor="rgba(57, 135, 229, 0)" />
            </linearGradient>
          </defs>
          <path
            pathLength={1}
            d="M0 11 H118 l7 -7 8 14 7 -7 H216 l6 -5 7 10 6 -5 H340"
          />
        </PulseSvg>
        <GlobeGap />
      </Column>
    </Screen>
  );
}
