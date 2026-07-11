import { useEffect, useMemo, useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, ShaderMaterial, Vector2 } from 'three';
import type { Mesh } from 'three';
import { auroraBackdrop } from './auroraBackdrop';
import { getFrostMaskTexture } from './cardFaces';

// Peak opacity of the frost pane. The card's own dark surface (drawn into the
// chart texture) does the darkening — the pane only supplies the glow.
export const FROST_OPACITY = 1;

// Sits between the chart image (z = 0) and the mirrored back face (z = -0.006).
const FROST_Z = -0.004;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// macOS material shaping on the blurred backdrop sample: saturation boost so
// the glass looks vivid rather than gray, then gain + a cool lift so a pane
// always reads as lit milk glass — even in front of a dim corner of the
// nebula, and especially on the back of the ring.
const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform sampler2D uMask;
  uniform vec2 uRes;
  uniform float uOpacity;
  varying vec2 vUv;

  const float SAT = 1.45;
  const float GAIN = 1.1;
  const vec3 LIFT = vec3(0.025, 0.032, 0.05);

  void main() {
    float m = texture2D(uMask, vUv).r;
    // Discarded corners must not occlude (the pane writes depth on purpose).
    if (m < 0.02) discard;
    vec3 col = texture2D(uTex, gl_FragCoord.xy / uRes).rgb;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, SAT) * GAIN + LIFT;
    gl_FragColor = vec4(col, uOpacity * m);
  }
`;

interface FrostPlateProps {
  width: number;
  height: number;
  /** Exposed so CarouselItem can fade the pane through the panel lifecycle
      (material via userData.frost). */
  meshRef?: Ref<Mesh>;
}

/**
 * Frosted backdrop pane just behind a ring panel's chart faces: it samples the
 * tiny aurora buffer (see auroraBackdrop in Aurora.tsx) at its own screen
 * position — the 64px render upsampled across the pane IS the heavy macOS
 * blur, for the cost of one texture fetch per fragment. No transmission pass,
 * no per-frame scene re-render.
 *
 * The pane writes depth on purpose: other panels are transparent and can't be
 * blurred, so the glass occludes them and glows instead of letting them poke
 * through sharply.
 *
 * Desktop-only (see CarouselItem), matching where the aurora buffer exists.
 */
export function FrostPlate({ width, height, meshRef }: FrostPlateProps) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTex: { value: null },
          uMask: { value: getFrostMaskTexture() },
          uRes: { value: new Vector2(1, 1) },
          uOpacity: { value: 0 },
        },
        transparent: true,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  const size = useRef(new Vector2());
  useFrame((state) => {
    // gl_FragCoord is in device pixels — track the drawing buffer, not the
    // CSS size, so the sample stays aligned across dpr changes (hero pin).
    state.gl.getDrawingBufferSize(size.current);
    (mat.uniforms.uRes.value as Vector2).copy(size.current);
    mat.uniforms.uTex.value = auroraBackdrop.tex;
  });

  return (
    <mesh
      ref={meshRef}
      material={mat}
      userData={{ frost: mat }}
      position={[0, 0, FROST_Z]}
      scale={[width, height, 1]}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
