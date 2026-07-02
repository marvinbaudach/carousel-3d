import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import { DoubleSide, MathUtils, Quaternion, Vector3 } from 'three';
import type { Mesh } from 'three';

/** World-space transform captured from the clicked ring panel. */
export interface HeroStart {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
}

interface HeroCardProps {
  url: string;
  start: HeroStart;
  /** Front-and-center pose the card flies to. */
  targetPosition: Vector3;
  targetScale: Vector3;
  /** When true the card flies back and calls onClosed once it arrives. */
  closing: boolean;
  onClosed: () => void;
}

const TRANSITION = 0.6; // seconds for a full open/close
const IDENTITY = new Quaternion();
const UP = new Vector3(0, 1, 0);
const _base = new Quaternion();
const _spin = new Quaternion();

// Ease that starts and ends gently for an elegant flight.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A single enlarged panel that flies from its ring slot to the viewer while
 * doing one unwinding 3D flip, then holds. Rendered at the scene root so its
 * target pose is expressed in plain world space.
 */
export function HeroCard({
  url,
  start,
  targetPosition,
  targetScale,
  closing,
  onClosed,
}: HeroCardProps) {
  const ref = useRef<Mesh>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    const dir = closing ? -1 : 1;
    progress.current = MathUtils.clamp(
      progress.current + (dir * delta) / TRANSITION,
      0,
      1,
    );
    const t = easeInOutCubic(progress.current);

    mesh.position.lerpVectors(start.position, targetPosition, t);
    mesh.scale.lerpVectors(start.scale, targetScale, t);

    // Base orientation eases from the tilted ring pose to facing the camera ...
    _base.slerpQuaternions(start.quaternion, IDENTITY, t);
    // ... plus a full spin that unwinds to zero so it settles flat.
    _spin.setFromAxisAngle(UP, (1 - t) * Math.PI * 2);
    mesh.quaternion.copy(_base).multiply(_spin);

    if (closing && progress.current === 0) onClosed();
  });

  return (
    <Image
      ref={ref}
      url={url}
      position={start.position}
      scale={[start.scale.x, start.scale.y]}
      transparent
      toneMapped={false}
      side={DoubleSide}
      radius={0.06}
    />
  );
}
