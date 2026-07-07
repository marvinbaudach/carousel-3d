import type { Ref } from 'react';
import type { Mesh } from 'three';
import { useIsMobile } from '../hooks/useIsMobile';

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
 * whole lifecycle, so there is never a glass/no-glass jump. raycast disabled so
 * clicks reach the dashboard.
 *
 * On desktop the plate carries a clearcoat lobe: a second specular layer that
 * mirrors the night environment and, being fresnel-weighted, glares along the
 * edges and on the panels curving away on the ring — the real glass look.
 * Mobile keeps a plain standard material (no clearcoat pass) so the shader
 * stays cheap across every on-stage plate; the reflection there is just the
 * boosted env map on the low roughness.
 */
export function GlassPlate({ width, height, meshRef }: GlassPlateProps) {
  const isMobile = useIsMobile();
  return (
    <mesh
      ref={meshRef}
      position={[0, 0, GLASS_THICKNESS / 2 + 0.01]}
      raycast={() => null}
    >
      <boxGeometry args={[width, height, GLASS_THICKNESS]} />
      {isMobile ? (
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={GLASS_OPACITY}
          roughness={0.05}
          metalness={0}
          envMapIntensity={3.2}
          depthWrite={false}
        />
      ) : (
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={GLASS_OPACITY}
          roughness={0.04}
          metalness={0}
          envMapIntensity={3.6}
          clearcoat={1}
          clearcoatRoughness={0.08}
          specularIntensity={1}
          depthWrite={false}
        />
      )}
    </mesh>
  );
}
