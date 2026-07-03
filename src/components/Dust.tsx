import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type Points } from 'three';

interface DustProps {
  /** Ring radius; the particle volume is sized relative to it. */
  radius: number;
  count?: number;
}

// A cheap field of drifting light motes behind the ring for depth and
// atmosphere. Thousands of points render in a single draw call; the whole
// cloud slowly rotates and bobs, so no per-particle work is needed.
export function Dust({ radius, count = 500 }: DustProps) {
  const ref = useRef<Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * radius * 4;
      arr[i * 3 + 1] = (Math.random() - 0.5) * radius * 2.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * radius * 4;
    }
    return arr;
  }, [count, radius]);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    points.rotation.y += delta * 0.02;
    points.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        sizeAttenuation
        color="#9fd8ff"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
