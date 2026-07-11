import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  MathUtils,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderTarget,
} from 'three';
import type { ShaderMaterial } from 'three';
import { auroraBackdrop } from './auroraBackdrop';
import { useIsMobile } from '../hooks/useIsMobile';

// A fullscreen shader backdrop: slow, domain-warped value noise in the dark
// blue/violet palette — an aurora-like flow that replaces the old starfield.
// One draw call, no per-particle or per-frame CPU work; the quad ignores the
// camera (raw clip-space position) and renders first with depth test off, so
// it always sits behind the ring.
//
// The nebula carries the active theme's accent: uTint eases toward the
// current filter's color, so a theme switch reads as the whole room changing
// mood, not just the cards swapping.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uTint;
  uniform float uGlow;
  // 0 while rendering the frost backdrop buffer: at 64px a star collapses
  // into one bright texel and upsamples to a drifting white smudge on the
  // glass — the milk glass shows only the nebula wash.
  uniform float uStars;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  // One layer of stars: hash a grid, keep ~18% of cells, jitter the star
  // inside its cell and give each a size, brightness and twinkle phase.
  float starLayer(vec2 uv, float scale, float tw) {
    vec2 g = uv * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float present = step(0.82, hash(id + 11.0));
    vec2 pos = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.7;
    float core = smoothstep(0.09, 0.0, length(f - pos));
    float b = hash(id + 5.5);
    float twinkle = 0.55 + 0.45 * sin(uTime * tw + b * 6.2831);
    return present * core * (0.35 + 0.65 * b) * twinkle;
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= uAspect;
    float t = uTime * 0.085;

    // Domain warp: feed one fbm into the next so the flow curls. The warp
    // field drifts on its own so the whole nebula visibly breathes and slides.
    vec2 q = vec2(
      fbm(uv * 1.5 + vec2(t * 0.6, t)),
      fbm(uv * 1.5 + vec2(5.2 - t * 0.4, -t * 0.8))
    );
    float n = fbm(uv * 2.0 + q * 1.5 + vec2(t * 0.9, t * 0.3));
    float n2 = fbm(uv * 3.5 - q * 1.2 - vec2(t * 0.6, t * 0.4));

    // Lifted base + layer weights: the cards are dark, so the room behind
    // them carries the light — a hazy dusk rather than near-black space.
    vec3 base = vec3(0.030, 0.042, 0.078);
    // The main and tertiary layers lean toward the theme tint; the violet
    // layer stays fixed so the nebula keeps depth instead of going monochrome.
    vec3 blue = mix(vec3(0.07, 0.17, 0.40), uTint, 0.6);
    vec3 violet = vec3(0.20, 0.12, 0.38);
    vec3 teal = mix(vec3(0.06, 0.23, 0.28), uTint, 0.45);

    vec3 col = base;
    col += blue * smoothstep(0.30, 0.92, n) * 0.70;
    col += violet * smoothstep(0.50, 1.02, n2) * 0.50;
    col += teal * smoothstep(0.55, 1.0, n * n2) * 0.34;

    // Keep the center calm so the panels stay readable; let the aurora glow
    // toward the edges and breathe slowly.
    float d = distance(vUv, vec2(0.5));
    float breath = 1.3 + 0.08 * sin(uTime * 0.4);
    col *= mix(0.82, breath, smoothstep(0.1, 0.75, d));

    // Hero focus: the nebula recedes while a card owns the screen and swells
    // back on close. Applied before the stars, so they hold steady while the
    // glow around them breathes back in.
    col *= uGlow;

    // Stars on top: two layers at different depths, added after the vignette
    // so they read evenly across the whole field.
    float s = starLayer(uv, 55.0, 2.2) + starLayer(uv, 90.0, 1.4) * 0.7;
    col += vec3(0.75, 0.82, 1.0) * s * 1.05 * uStars;

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface AuroraProps {
  /** Accent color of the active theme (a TAGS entry's `accent`). */
  accent: string;
  /** True while a hero owns the screen: the nebula recedes to a dim floor and
      swells back with an eased bloom once released. */
  calm?: boolean;
}

// The accents are bright chart colors; scaled down to nebula luminance so the
// tinted layers sit in the same band as the base blue (max ~0.40).
const TINT_SCALE = 0.48;

// Nebula brightness floor while a hero owns the screen (the scrim dims on top
// of this, so the room drops well back without going dead black).
const CALM_GLOW = 0.35;
// The recede rides the hero fly-in; the swell back is a long, deliberate
// bloom — an S-curve with zero slope at both ends, so it starts imperceptibly
// and settles softly instead of flicking on with the scrim.
const DIM_TIME = 0.6;
const SWELL_TIME = 1.6;

// Zero slope at both ends: the glow never steps, even across a hitchy frame.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 64px wide is the blur radius sweet spot: sharp enough that the nebula's
// drift stays recognizable through the glass, soft enough that stars and any
// structure dissolve completely.
const BACKDROP_W = 64;
const BACKDROP_H = 36;

export function Aurora({ accent, calm = false }: AuroraProps) {
  const mat = useRef<ShaderMaterial>(null);
  // Lit progress (1 = full nebula, 0 = calm floor), advanced linearly per
  // frame and shaped by the ease below — no React state per frame.
  const lit = useRef(1);
  // The frost backdrop buffer is only consumed by the desktop frost panes.
  const isMobile = useIsMobile();
  const backdrop = useMemo(() => {
    if (isMobile) return null;
    const target = new WebGLRenderTarget(BACKDROP_W, BACKDROP_H, { depthBuffer: false });
    // Same material as the fullscreen quad (assigned each frame, see below);
    // the clip-space vertex shader ignores the camera entirely.
    const mesh = new Mesh(new PlaneGeometry(2, 2));
    const scene = new Scene();
    scene.add(mesh);
    return { target, mesh, scene, camera: new OrthographicCamera() };
  }, [isMobile]);
  // The backdrop only feeds a heavily upsampled milk-glass sample, so a 30 Hz
  // refresh is indistinguishable from 60 — update it every other frame and hand
  // the render-target pass back to the frame budget half the time.
  const backdropParity = useRef(0);
  useEffect(() => {
    if (!backdrop) return;
    auroraBackdrop.tex = backdrop.target.texture;
    return () => {
      auroraBackdrop.tex = null;
      backdrop.target.dispose();
      backdrop.mesh.geometry.dispose();
    };
  }, [backdrop]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      // Seeded with the original nebula blue; the first frames ease it over
      // to the active theme, which doubles as a subtle boot color-in.
      uTint: { value: new Color(0.05, 0.13, 0.32) },
      uGlow: { value: 1 },
      uStars: { value: 1 },
    }),
    [],
  );
  const tintTarget = useMemo(() => new Color(accent).multiplyScalar(TINT_SCALE), [accent]);

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    m.uniforms.uAspect.value = state.viewport.aspect;
    // Frame-rate independent ease toward the active theme's tint.
    m.uniforms.uTint.value.lerp(tintTarget, 1 - Math.exp(-delta * 1.4));
    // Clamp delta so the dpr/effect-stack hitch at the hero seams cannot leap
    // the bloom (same convention as the ring and camera).
    const dt = Math.min(delta, 1 / 30);
    lit.current = MathUtils.clamp(
      lit.current + (calm ? -dt / DIM_TIME : dt / SWELL_TIME),
      0,
      1,
    );
    m.uniforms.uGlow.value =
      CALM_GLOW + (1 - CALM_GLOW) * easeInOutCubic(lit.current);

    // Refresh the frost backdrop into the tiny buffer, every other frame (see
    // backdropParity). Stars are masked out — at 64px one collapses to a white
    // texel that smears across the glass.
    backdropParity.current ^= 1;
    if (backdrop && backdropParity.current === 0) {
      backdrop.mesh.material = m;
      m.uniforms.uStars.value = 0;
      state.gl.setRenderTarget(backdrop.target);
      state.gl.render(backdrop.scene, backdrop.camera);
      state.gl.setRenderTarget(null);
      m.uniforms.uStars.value = 1;
    }
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
