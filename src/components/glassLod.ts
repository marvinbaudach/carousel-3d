import type { Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

// LOD hysteresis on the facing value (see CarouselItem): promote to the
// clearcoat material above RICH, demote below CHEAP. The dead band keeps a
// panel from flip-flopping between shader programs right at the threshold.
const LOD_RICH = 0.65;
const LOD_CHEAP = 0.55;

/** The material pair a desktop ring plate swaps between (see GlassPlate). */
export interface GlassLod {
  rich: MeshPhysicalMaterial;
  cheap: MeshStandardMaterial;
}

/**
 * Glass LOD for the ring: the clearcoat lobe only earns its cost on the
 * front-facing panels, where its fresnel glare actually reads; side panels
 * swap to the cheap standard material (same env reflection, no second
 * specular pass). Call once per frame with the panel's eased facing value;
 * a no-op on meshes without LOD materials (mobile, hero).
 */
export function updateGlassLod(mesh: Mesh, eased: number): void {
  const lod = mesh.userData.glassLod as GlassLod | undefined;
  if (!lod) return;
  const current = mesh.material;
  const next =
    eased > LOD_RICH ? lod.rich : eased < LOD_CHEAP ? lod.cheap : current;
  if (next === current) return;
  // Carry the animated opacity over so the swap never pops.
  (next as MeshStandardMaterial).opacity = (current as MeshStandardMaterial).opacity;
  mesh.material = next;
}
