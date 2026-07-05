import { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { LIVE_FEEDS } from '../data/sources';

interface LoadingScreenProps {
  done: boolean;
  onExited: () => void;
}

// Where the data stations sit on the globe — the cities of the real APIs in
// data/sources.ts, so the loader stays honest about its sources.
const CITY: Record<string, { lat: number; lon: number }> = {
  ZRH: { lat: 47.4, lon: 8.5 },
  SFO: { lat: 37.8, lon: -122.4 },
  WAS: { lat: 38.9, lon: -77.0 },
};

const STATIONS = [...new Set(LIVE_FEEDS.map((f) => f.code))].filter((c) => CITY[c]);
const TOTAL_FEEDS = LIVE_FEEDS.length;

// How long the dots take to converge into the center once loading is done —
// they collapse into exactly the point the carousel panels bloom out of.
const CONVERGE_MS = 750;

const MONO = "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace";

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

const Column = styled.div<{ $leaving: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  transform: ${(p) => (p.$leaving ? 'scale(0.82)' : 'scale(1)')};
  transition: transform 0.9s cubic-bezier(0.7, 0, 0.84, 0);
  pointer-events: none;
`;

const Wordmark = styled.div<{ $done: boolean }>`
  color: #f4f7fb;
  font-size: clamp(1.3rem, 4.5vw, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.5em;
  margin-left: 0.5em; /* optically recenter the tracked-out text */
  text-shadow: 0 0 30px rgba(5, 7, 12, 0.9);
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
  text-shadow: 0 0 20px rgba(5, 7, 12, 0.9);
`;

// Empty space the globe rotates through; the type sits above, progress below.
const GlobeGap = styled.div`
  height: min(48vmin, 44vh);
`;

const BarTrack = styled.div`
  width: min(340px, 80vw);
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

const Status = styled.div`
  display: flex;
  justify-content: space-between;
  width: min(340px, 80vw);
  color: #52616e;
  font-family: ${MONO};
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.18em;
`;

/** lat/lon (degrees) -> unit sphere. */
function toVec(lat: number, lon: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

/** Spherical interpolation between two unit vectors. */
function slerp(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const th = Math.acos(dot);
  if (th < 1e-4) return a;
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
}

export function LoadingScreen({ done, onExited }: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);
  const [connected, setConnected] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  doneRef.current = done;

  // Stagger the source counter across the boot beat.
  useEffect(() => {
    const step = 1250 / TOTAL_FEEDS;
    const timers = LIVE_FEEDS.map((_, i) =>
      window.setTimeout(
        () => setConnected((c) => Math.max(c, i + 1)),
        120 + i * step + Math.random() * Math.min(90, step * 0.5),
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // The globe: ~1500 dots on a sphere swirling in from the center, rotating;
  // the data stations pulse and send packets along great-circle arcs. On
  // `done` everything spirals back into the screen center — the same point
  // the iris then closes over and the carousel panels bloom out of.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // reduced motion: no globe, exit handled by the timer below
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fibonacci sphere.
    const N = 1500;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts: [number, number, number][] = Array.from({ length: N }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const a = i * golden;
      return [Math.sin(a) * r, y, Math.cos(a) * r];
    });
    const stations = STATIONS.map((code) => ({
      code,
      v: toVec(CITY[code].lat, CITY[code].lon),
    }));
    // Great-circle arcs between consecutive stations (loop closed).
    const arcs = stations.map((s, i) => ({
      a: s.v,
      b: stations[(i + 1) % stations.length].v,
      phase: i / stations.length,
    }));

    const TILT = 0.42;
    let raf = 0;
    let doneAt: number | null = null;
    let exited = false;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Convergence: after done, dots spiral into the center; the loop hands
      // over to the iris exactly once.
      if (doneRef.current && doneAt === null) doneAt = now;
      const conv = doneAt ? Math.min(1, (now - doneAt) / CONVERGE_MS) : 0;
      const ease = conv * conv * (3 - 2 * conv); // smoothstep
      if (conv >= 1 && !exited) {
        exited = true;
        setLeaving(true);
      }

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.3 * (1 - ease);
      // Assembly: dots swirl outward from the center during the first beat.
      const assemble = Math.min(1, t / 1.1);
      const aEase = 1 - Math.pow(1 - assemble, 3);
      const rot = t * 0.32 + (1 - aEase) * 2.2 + ease * 1.6;

      const sinR = Math.sin(rot);
      const cosR = Math.cos(rot);
      const sinT = Math.sin(TILT);
      const cosT = Math.cos(TILT);
      const project = (p: [number, number, number]) => {
        const x1 = p[0] * cosR + p[2] * sinR;
        const z1 = -p[0] * sinR + p[2] * cosR;
        const y2 = p[1] * cosT - z1 * sinT;
        const z2 = p[1] * sinT + z1 * cosT;
        return { x: cx + x1 * R * aEase, y: cy - y2 * R * aEase, z: z2 };
      };

      // Sphere dots — back ones dim, front ones bright.
      for (let i = 0; i < N; i++) {
        const q = project(pts[i]);
        const depth = (q.z + 1) / 2;
        const alpha = (0.22 + depth * 0.62) * aEase * (1 - ease * 0.6);
        ctx.fillStyle = `rgba(122, 165, 224, ${alpha})`;
        const s = 1.4 + depth * 2.1;
        ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      }

      // Arcs with a travelling packet each.
      for (const arc of arcs) {
        const head = (t * 0.45 + arc.phase) % 1;
        for (let k = 0; k <= 44; k++) {
          const ft = k / 44;
          const v = slerp(arc.a, arc.b, ft);
          const lift = 1 + 0.28 * Math.sin(Math.PI * ft);
          const q = project([v[0] * lift, v[1] * lift, v[2] * lift]);
          if (q.z < -0.15) continue; // behind the globe
          const packet = Math.max(0, 1 - Math.abs(ft - head) * 14);
          const alpha = (0.2 + packet * 0.8) * aEase * (1 - ease);
          ctx.fillStyle =
            packet > 0.25
              ? `rgba(144, 133, 233, ${alpha})`
              : `rgba(57, 135, 229, ${alpha})`;
          const s = 2 + packet * 3.4;
          ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        }
      }

      // Stations: bright dot, ping ring, code label on the front side.
      stations.forEach((st, i) => {
        const q = project(st.v);
        if (q.z < -0.05) return;
        const front = Math.min(1, (q.z + 0.05) / 0.6);
        const a = front * aEase * (1 - ease);
        ctx.fillStyle = `rgba(120, 180, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
        const ring = (t * 0.7 + i * 0.33) % 1;
        ctx.strokeStyle = `rgba(57, 135, 229, ${(1 - ring) * 0.55 * a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4 + ring * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(143, 184, 236, ${0.85 * a})`;
        ctx.font = `600 11px ${MONO}`;
        ctx.fillText(st.code, q.x + 9, q.y + 4);
      });

      if (!exited) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

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

  // Reduced motion has no converge animation — leave on a short timer.
  useEffect(() => {
    if (!done || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setLeaving(true), 420);
    return () => window.clearTimeout(t);
  }, [done]);

  const shown = done ? TOTAL_FEEDS : connected;

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

      <GlobeCanvas ref={canvasRef} aria-hidden />

      <Column $leaving={leaving}>
        <Wordmark $done={done}>WORLDPULSE</Wordmark>
        <Sub>GLOBALE DATENQUELLEN WERDEN GELADEN</Sub>
        <GlobeGap />
        <BarTrack>
          <BarFill $done={done} />
        </BarTrack>
        <Status>
          <span>
            {shown}/{TOTAL_FEEDS} QUELLEN
          </span>
          <span>{pct}%</span>
        </Status>
      </Column>
    </Screen>
  );
}
