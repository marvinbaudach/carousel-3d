import { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

interface LoadingScreenProps {
  done: boolean;
  onExited: () => void;
}

// The background lights breathe slowly, so the illumination drifts.
const breathe = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.12); }
`;
// Quick "locked in" pulse once the boot completes.
const completePulse = keyframes`
  0% { transform: scale(1); }
  45% { transform: scale(1.07); }
  100% { transform: scale(1); }
`;
// Progress fill sweeping in during boot.
const grow = keyframes`
  from { width: 4%; }
  to { width: 88%; }
`;

// Exit: an iris that collapses into the exact point the carousel panels
// bloom out of — the loader hands the center of the screen to the scene.
const Screen = styled.div<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #05070c;
  clip-path: ${(p) => (p.$leaving ? 'circle(0% at 50% 50%)' : 'circle(141% at 50% 50%)')};
  pointer-events: ${(p) => (p.$leaving ? 'none' : 'auto')};
  transition: clip-path 0.9s cubic-bezier(0.7, 0, 0.84, 0);
  overflow: hidden;
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

const Column = styled.div<{ $leaving: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
  transform: ${(p) => (p.$leaving ? 'scale(0.82)' : 'scale(1)')};
  transition: transform 0.9s cubic-bezier(0.7, 0, 0.84, 0);
`;

const Wordmark = styled.div<{ $done: boolean }>`
  color: #f4f7fb;
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: 0.5em;
  margin-left: 0.5em; /* optically recenter the tracked-out text */
  ${(p) =>
    p.$done &&
    css`
      animation: ${completePulse} 0.55s ease;
    `}
`;

const Sub = styled.div`
  color: #898781;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.4em;
  margin-left: 0.4em;
`;

const BarTrack = styled.div`
  width: 240px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
`;

const BarFill = styled.div<{ $done: boolean }>`
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #3987e5, #9085e9);
  animation: ${grow} 1.5s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
  ${(p) =>
    p.$done &&
    css`
      animation: none;
      width: 100%;
      transition: width 0.35s ease;
    `}
`;

const Pct = styled.div`
  color: #52616e;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.18em;
`;

export function LoadingScreen({ done, onExited }: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);

  // Eased percentage: climbs toward 92 while booting, snaps to 100 on done.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = done ? 100 : 92;
      pctRef.current += (target - pctRef.current) * (done ? 0.2 : 0.045);
      const next = Math.round(pctRef.current);
      setPct((prev) => (prev === next ? prev : next));
      if (pctRef.current < 99.6) raf = requestAnimationFrame(tick);
      else setPct(100);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  // Brief hold at 100% (lets the completion pulse read), then iris out.
  useEffect(() => {
    if (!done) return;
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
      <Glow $x="30%" $y="32%" $color="rgba(57, 135, 229, 0.28)" $delay="0s" />
      <Glow $x="72%" $y="64%" $color="rgba(144, 133, 233, 0.22)" $delay="-3s" />
      <Glow $x="55%" $y="45%" $color="rgba(25, 158, 112, 0.14)" $delay="-6s" />

      <Column $leaving={leaving}>
        <Wordmark $done={done}>PULSE</Wordmark>
        <Sub>ANALYTICS · BOOT SEQUENCE</Sub>

        <BarTrack>
          <BarFill $done={done} />
        </BarTrack>
        <Pct>{pct}%</Pct>
      </Column>
    </Screen>
  );
}
