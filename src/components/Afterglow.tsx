import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  CanvasTexture,
  type PointLight,
  type Sprite,
  type SpriteMaterial,
} from 'three';

interface AfterglowProps {
  /** Ring radius; glow size and light reach scale with it. */
  radius: number;
}

// Lifetime of the glow. The loader's iris fade runs ~1.1s after the scene
// mounts; the glow outlives it slightly so the light visibly dies inside
// the 3D scene instead of vanishing with the DOM.
const LIFE_S = 1.8;

// The supernova's afterglow: the loader's exit flash lives in the DOM and
// dies with the screen fade, so this carries the same light source into the
// WebGL scene — the panels fly out of a glow that is still there when the
// loader is gone. Flares up fast, exhales, then unmounts itself for good.
export function Afterglow({ radius }: AfterglowProps) {
  const spriteRef = useRef<Sprite>(null);
  const lightRef = useRef<PointLight>(null);
  const [dead, setDead] = useState(false);
  const t0 = useRef<number | null>(null);

  // Soft radial bloom, same bluish white the loader flash cools into.
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(240, 246, 255, 1)');
      g.addColorStop(0.22, 'rgba(188, 208, 255, 0.55)');
      g.addColorStop(0.55, 'rgba(87, 135, 229, 0.16)');
      g.addColorStop(1, 'rgba(57, 135, 229, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state) => {
    const sprite = spriteRef.current;
    if (dead || !sprite) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const p = (state.clock.elapsedTime - t0.current) / LIFE_S;
    if (p >= 1) {
      setDead(true);
      return;
    }
    // Fast flare-up, long exhale — and the bloom expands as it thins,
    // like hot gas dispersing.
    const flare = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9;
    const env = flare * flare * (3 - 2 * flare); // smoothstep
    const s = radius * (0.55 + p * 0.5);
    sprite.scale.set(s, s, 1);
    (sprite.material as SpriteMaterial).opacity = env;
    if (lightRef.current) lightRef.current.intensity = env * 26;
  });

  if (dead) return null;
  return (
    <group>
      <sprite ref={spriteRef}>
        <spriteMaterial
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
        />
      </sprite>
      {/* Unlit panel textures ignore this, but the glass layers pick up a
          brief glint while the flare passes over them. */}
      <pointLight ref={lightRef} color="#bcd0ff" intensity={0} distance={radius * 2} decay={2} />
    </group>
  );
}
