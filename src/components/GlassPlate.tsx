import type { Ref } from 'react';
import type { Mesh } from 'three';

// Thickness of the glass plate sitting in front of each dashboard, giving the
// panels real depth instead of looking like flat sheets.
export const GLASS_THICKNESS = 0.08;
// Base transparency of the glass; front panels get a touch clearer.
export const GLASS_OPACITY = 0.16;

interface GlassPlateProps {
  width: number;
  height: number;
  /** Exposed so owners can fade or rescale the plate imperatively. */
  meshRef?: Ref<Mesh>;
}

/**
 * The glossy, environment-reflecting glass slab shared by the ring panels and
 * the hero card — the same plate travels visually with a panel through its
 * whole lifecycle, so there is never a glass/no-glass jump. A plain standard
 * material (no transmission pass, no clearcoat lobe) keeps the shader cheap
 * across all the on-stage plates; the glossy reflection comes from the low
 * roughness plus the boosted env map. raycast disabled so clicks reach the
 * dashboard.
 */
export function GlassPlate({ width, height, meshRef }: GlassPlateProps) {
  return (
    <mesh
      ref={meshRef}
      position={[0, 0, GLASS_THICKNESS / 2 + 0.01]}
      raycast={() => null}
    >
      <boxGeometry args={[width, height, GLASS_THICKNESS]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={GLASS_OPACITY}
        roughness={0.05}
        metalness={0}
        envMapIntensity={3.2}
        depthWrite={false}
      />
    </mesh>
  );
}
