import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';

interface CameraRigProps {
  /** Fixed camera distance on Z; only X/Y drift with the pointer. */
  baseZ: number;
}

// Subtle parallax: the camera eases toward the pointer and keeps looking at the
// ring center, giving the whole scene a lively, three-dimensional feel.
export function CameraRig({ baseZ }: CameraRigProps) {
  const camera = useThree((s) => s.camera);

  useFrame((state) => {
    camera.position.x = MathUtils.lerp(camera.position.x, state.pointer.x * 1.4, 0.05);
    camera.position.y = MathUtils.lerp(camera.position.y, state.pointer.y * 0.9, 0.05);
    camera.position.z = baseZ;
    camera.lookAt(0, 0, 0);
  });

  return null;
}
