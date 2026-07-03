import { useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import { DoubleSide, MathUtils, Quaternion, Vector3 } from 'three';
import type { Mesh, Texture } from 'three';
import type { HeroStart } from './HeroCard';

interface CarouselItemProps {
  url: string;
  /** Angular position on the ring (radians). */
  angle: number;
  radius: number;
  width: number;
  height: number;
  /** Hide this panel while its hero copy is on screen. */
  hidden: boolean;
  /** Click -> open the hero card starting from this panel's world transform. */
  onSelect: (url: string, start: HeroStart) => void;
  /** Guard so the end of a drag is not treated as a click. */
  wasDrag: () => boolean;
  /** Per-panel delay (seconds) for the staggered entrance fly-out. */
  entranceDelay: number;
}

type ImageMaterial = {
  opacity: number;
  grayscale: number;
  zoom: number;
  map: Texture | null;
};

const worldPos = new Vector3();

// Duration of the one-time entrance fly-out per panel.
const ENTRANCE_DURATION = 0.9;

export function CarouselItem({
  url,
  angle,
  radius,
  width,
  height,
  hidden,
  onSelect,
  wasDrag,
  entranceDelay,
}: CarouselItemProps) {
  const ref = useRef<Mesh>(null);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const anisotropySet = useRef(false);
  const entranceStart = useRef<number | null>(null);

  // Position on the ring; the plane faces outward toward the viewer.
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;

    const mat = mesh.material as unknown as ImageMaterial;

    // Apply max anisotropic filtering once the texture is available so tilted
    // panels stay sharp instead of smearing at glancing angles.
    if (!anisotropySet.current && mat.map) {
      mat.map.anisotropy = maxAnisotropy;
      mat.map.needsUpdate = true;
      anisotropySet.current = true;
    }

    // While the hero copy is flying, fade this panel out of the ring.
    if (hidden) {
      mat.opacity = MathUtils.lerp(mat.opacity, 0, 0.2);
      return;
    }

    // One-time entrance: panels fly out from the center to their ring slot,
    // staggered and scaling up as they arrive.
    const now = state.clock.elapsedTime;
    if (entranceStart.current === null) entranceStart.current = now;
    const p = MathUtils.clamp(
      (now - entranceStart.current - entranceDelay) / ENTRANCE_DURATION,
      0,
      1,
    );
    if (p < 1) {
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      mesh.position.set(x * e, 0, z * e);
      const s = 0.5 + 0.5 * e;
      mesh.scale.set(width * s, height * s, 1);
      mat.opacity = e;
      mat.grayscale = 0;
      mat.zoom = 1;
      return;
    }

    // World position determines closeness to the camera (camera looks along +Z).
    mesh.getWorldPosition(worldPos);
    // facing: 1 = right up front (near), 0 = at the back of the ring.
    const facing = (worldPos.z / radius + 1) / 2;
    const eased = Math.pow(MathUtils.clamp(facing, 0, 1), 1.5);

    // Back images: darker, desaturated and slightly zoomed out -> depth.
    // Minimum opacity kept higher so the back sides stay recognizable.
    mat.opacity = MathUtils.lerp(mat.opacity, 0.4 + eased * 0.6, 0.15);
    mat.grayscale = MathUtils.lerp(mat.grayscale, (1 - eased) * 0.7, 0.15);
    mat.zoom = MathUtils.lerp(mat.zoom, 1 + (1 - eased) * 0.15, 0.15);

    // Front images slightly larger -> "focus" feel (keep base dimensions).
    const focus = 1 + eased * 0.08;
    mesh.scale.set(width * focus, height * focus, 1);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (wasDrag()) return; // it was a drag, not a click
    const mesh = ref.current;
    if (!mesh) return;
    mesh.updateWorldMatrix(true, false);
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    mesh.matrixWorld.decompose(position, quaternion, scale);
    onSelect(url, { position, quaternion, scale });
  };

  return (
    <Image
      ref={ref}
      url={url}
      position={[x, 0, z]}
      rotation={[0, angle, 0]}
      transparent
      toneMapped={false}
      side={DoubleSide}
      radius={0.06}
      scale={[width, height]}
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    />
  );
}
