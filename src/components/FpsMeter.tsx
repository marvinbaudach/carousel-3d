import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Meter = styled.div`
  position: fixed;
  top: 14px;
  right: 16px;
  z-index: 20;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(10, 14, 22, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  pointer-events: none;
  user-select: none;
`;

/**
 * Lightweight FPS readout. Counts rAF ticks and updates the label once per
 * second by writing to the DOM node directly — no React state, so the meter
 * itself never causes re-renders.
 */
export function FpsMeter() {
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 1000) {
        const fps = Math.round((frames * 1000) / elapsed);
        if (labelRef.current) labelRef.current.textContent = `${fps} FPS`;
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return <Meter ref={labelRef}>— FPS</Meter>;
}
