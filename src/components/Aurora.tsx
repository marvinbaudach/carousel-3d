import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';

// A fullscreen shader backdrop: slow, domain-warped value noise in the dark
// blue/violet palette — an aurora-like flow that replaces the old starfield.
// One draw call, no per-particle or per-frame CPU work; the quad ignores the
// camera (raw clip-space position) and renders first with depth test off, so
// it always sits behind the ring.

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
    float t = uTime * 0.06;

    // Domain warp: feed one fbm into the next so the flow curls. The warp
    // field drifts on its own so the whole nebula visibly breathes and slides.
    vec2 q = vec2(
      fbm(uv * 1.5 + vec2(t * 0.6, t)),
      fbm(uv * 1.5 + vec2(5.2 - t * 0.4, -t * 0.8))
    );
    float n = fbm(uv * 2.0 + q * 1.5 + vec2(t * 0.9, t * 0.3));
    float n2 = fbm(uv * 3.5 - q * 1.2 - vec2(t * 0.6, t * 0.4));

    vec3 base = vec3(0.016, 0.023, 0.043);
    vec3 blue = vec3(0.05, 0.13, 0.32);
    vec3 violet = vec3(0.16, 0.09, 0.30);
    vec3 teal = vec3(0.04, 0.18, 0.22);

    vec3 col = base;
    col += blue * smoothstep(0.35, 0.95, n) * 0.55;
    col += violet * smoothstep(0.55, 1.05, n2) * 0.40;
    col += teal * smoothstep(0.6, 1.0, n * n2) * 0.25;

    // Keep the center calm so the panels stay readable; let the aurora glow
    // toward the edges.
    float d = distance(vUv, vec2(0.5));
    col *= mix(0.7, 1.15, smoothstep(0.1, 0.75, d));

    // Stars on top: two layers at different depths, added after the vignette
    // so they read evenly across the whole field.
    float s = starLayer(uv, 55.0, 2.2) + starLayer(uv, 90.0, 1.4) * 0.7;
    col += vec3(0.75, 0.82, 1.0) * s * 0.9;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Aurora() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAspect: { value: 1 } }),
    [],
  );

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    m.uniforms.uAspect.value = state.viewport.aspect;
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
