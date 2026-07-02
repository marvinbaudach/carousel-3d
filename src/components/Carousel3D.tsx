import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import { Environment } from '@react-three/drei';
import { Vector3 } from 'three';
import { CarouselItem } from './CarouselItem';
import { HeroCard, type HeroStart } from './HeroCard';
import { useCarouselRotation } from '../hooks/useCarouselRotation';
import { IMAGES } from '../data/images';

// Panel dimensions in world units (4:5 aspect ratio).
const PANEL_W = 2.4;
const PANEL_H = 3.0;
// Radius chosen so the panels do not overlap.
const RADIUS = (PANEL_W * IMAGES.length) / (2 * Math.PI) + 0.6;

// Front-and-center pose the hero card flies to (between ring front and camera).
const HERO_Z = RADIUS + 4.5;
const HERO_SCALE = new Vector3(2.88, 3.6, 1);

interface RingProps {
  onSelect: (url: string, start: HeroStart) => void;
  selectedUrl: string | null;
  paused: () => boolean;
}

function Ring({ onSelect, selectedUrl, paused }: RingProps) {
  const { groupRef, tiltRef, wasDrag } = useCarouselRotation({
    autoSpin: 0.12,
    paused,
  });
  const step = (Math.PI * 2) / IMAGES.length;

  return (
    // Outer group tilts the ring (driven by vertical drag) so the far side and
    // the back sides of the images come into view. Inner group spins on Y.
    <group ref={tiltRef}>
      <group ref={groupRef}>
        {IMAGES.map((img, i) => (
          <CarouselItem
            key={img.id}
            url={img.url}
            angle={i * step}
            radius={RADIUS}
            width={PANEL_W}
            height={PANEL_H}
            hidden={img.url === selectedUrl}
            onSelect={onSelect}
            wasDrag={wasDrag}
          />
        ))}
      </group>
    </group>
  );
}

export function Carousel3D() {
  const [selected, setSelected] = useState<{ url: string; start: HeroStart } | null>(
    null,
  );
  const [closing, setClosing] = useState(false);

  const heroTarget = useMemo(() => new Vector3(0, 0, HERO_Z), []);

  const open = (url: string, start: HeroStart) => {
    if (selected) return; // one hero at a time
    setSelected({ url, start });
    setClosing(false);
  };
  const requestClose = () => {
    if (selected && !closing) setClosing(true);
  };
  const finishClose = () => {
    setSelected(null);
    setClosing(false);
  };

  // Close the hero via Escape or the scroll wheel (click-away is handled by
  // the canvas onPointerMissed below).
  useEffect(() => {
    if (!selected || closing) return;
    const close = () => setClosing(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', close, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', close);
    };
  }, [selected, closing]);

  // Focus the depth of field on the hero while it is open, on the ring otherwise.
  const focusZ = selected ? HERO_Z : RADIUS;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, RADIUS + 9], fov: 40 }}
      gl={{ antialias: true }}
      onPointerMissed={requestClose}
    >
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', RADIUS + 2, RADIUS * 2 + 8]} />

      <ambientLight intensity={0.6} />
      <Environment preset="night" />

      <Ring
        onSelect={open}
        selectedUrl={selected?.url ?? null}
        paused={() => selected !== null}
      />

      {selected && (
        <HeroCard
          url={selected.url}
          start={selected.start}
          targetPosition={heroTarget}
          targetScale={HERO_SCALE}
          closing={closing}
          onClosed={finishClose}
        />
      )}

      <EffectComposer>
        <DepthOfField
          target={[0, 0, focusZ]}
          focalLength={0.02}
          bokehScale={2}
          height={1080}
        />
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
