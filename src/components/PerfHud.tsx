import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import styled from 'styled-components';

/**
 * Renderer stats sampled inside the Canvas and read by the DOM HUD outside
 * it. A plain module object (no React state) so neither side re-renders the
 * other; the HUD polls it on its own slow interval.
 */
const stats = {
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  dpr: 1,
  width: 0,
  height: 0,
};

/** Mount once inside the Canvas: mirrors renderer.info into the store. */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);

  // The EffectComposer issues several renderer.render() calls per frame and
  // each one auto-resets info — the counters would only ever show the last
  // fullscreen pass. Disable auto-reset and reset once per frame instead, so
  // a frame's passes accumulate into one honest total.
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useFrame(() => {
    // useFrame runs before this frame renders, so info still holds the
    // finished totals of the previous frame: read, then reset.
    stats.calls = gl.info.render.calls;
    stats.triangles = gl.info.render.triangles;
    stats.geometries = gl.info.memory.geometries;
    stats.textures = gl.info.memory.textures;
    stats.dpr = gl.getPixelRatio();
    stats.width = gl.domElement.width;
    stats.height = gl.domElement.height;
    gl.info.reset();
  });
  return null;
}

/** Chrome-only heap readout; other browsers simply omit the row. */
function heapMB(): number | null {
  const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;
}

const Panel = styled.button`
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
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-align: left;
  user-select: none;
  cursor: pointer;

  &:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }
`;

const FpsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Chevron = styled.span<{ $open: boolean }>`
  font-size: 9px;
  opacity: 0.5;
  transform: rotate(${(p) => (p.$open ? 90 : 0)}deg);
  transition: transform 0.15s ease;
`;

const Grid = styled.dl`
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px 14px;
  margin: 8px 0 2px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  dt {
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.08em;
    font-size: 10px;
    text-transform: uppercase;
    align-self: baseline;
  }
  dd {
    margin: 0;
    text-align: right;
    color: rgba(255, 255, 255, 0.85);
  }
`;

interface Snapshot {
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  resolution: string;
  heap: number | null;
}

/**
 * Performance HUD. Collapsed: an FPS pill (written straight to the DOM, no
 * React state). Click to expand renderer internals — draw calls, triangles,
 * render resolution behind the adaptive dpr, GPU-side texture/geometry counts
 * and (in Chrome) the JS heap — sampled at 2 Hz.
 */
export function PerfHud() {
  const fpsRef = useRef<HTMLSpanElement>(null);
  const frame = useRef({ fps: 0, ms: 0 });
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 1000) {
        frame.current.fps = Math.round((frames * 1000) / elapsed);
        frame.current.ms = elapsed / frames;
        if (fpsRef.current) fpsRef.current.textContent = `${frame.current.fps} FPS`;
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!open) return;
    const read = () =>
      setSnap({
        fps: frame.current.fps,
        frameMs: frame.current.ms,
        calls: stats.calls,
        triangles: stats.triangles,
        geometries: stats.geometries,
        textures: stats.textures,
        resolution: `${stats.width}×${stats.height} @${stats.dpr.toFixed(2)}x`,
        heap: heapMB(),
      });
    read();
    const id = window.setInterval(read, 500);
    return () => window.clearInterval(id);
  }, [open]);

  return (
    <Panel
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      title="Renderer performance"
    >
      <FpsRow>
        <span ref={fpsRef}>— FPS</span>
        <Chevron $open={open}>▶</Chevron>
      </FpsRow>

      {open && snap && (
        <Grid>
          <dt>frame</dt>
          <dd>{snap.frameMs.toFixed(1)} ms</dd>
          <dt>render</dt>
          <dd>{snap.resolution}</dd>
          <dt>draw calls</dt>
          <dd>{snap.calls}</dd>
          <dt>triangles</dt>
          <dd>{snap.triangles >= 1000 ? `${(snap.triangles / 1000).toFixed(1)}k` : snap.triangles}</dd>
          <dt>textures</dt>
          <dd>{snap.textures}</dd>
          <dt>geometries</dt>
          <dd>{snap.geometries}</dd>
          {snap.heap !== null && (
            <>
              <dt>js heap</dt>
              <dd>{snap.heap} MB</dd>
            </>
          )}
        </Grid>
      )}
    </Panel>
  );
}
