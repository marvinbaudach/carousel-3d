// Dev-only review gallery — the living backdrop: the app's own Aurora shader
// (nebula + two star layers) in a bare, lightweight Canvas, so the gallery sits
// over the same starfield as the ring rather than a flat fill. No ring, no
// EffectComposer, no PerformanceMonitor — one shader quad, so it's cheap; and
// it freezes (frameloop="never") whenever the gallery isn't the active view.
//
// The nebula's tint follows the active category's accent, exactly like the
// app's theme switch, so filtering visibly recolors the room.

import { Canvas } from '@react-three/fiber';
import { Aurora } from '../components/Aurora';

interface GalleryBackdropProps {
  /** Accent of the active category — the nebula eases toward it. */
  accent: string;
  /** Render only while the gallery owns the screen; frozen otherwise. */
  active: boolean;
}

export function GalleryBackdrop({ accent, active }: GalleryBackdropProps) {
  return (
    <Canvas
      // Aurora draws in raw clip space and ignores the camera, so the exact
      // camera/gl settings don't matter — antialias off since a full-screen
      // gradient has no edges to smooth.
      frameloop={active ? 'always' : 'never'}
      // `flat` disables ACES tone mapping. The app renders Aurora through an
      // EffectComposer whose output pass leaves the nebula un-tone-mapped, so a
      // bare Canvas applying ACES here would crush and desaturate the exact same
      // shader into flat navy — `flat` keeps the gallery's backdrop as luminous
      // as the ring's.
      flat
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* encode: no EffectComposer here to sRGB-encode the linear shader, so
          Aurora applies the transfer itself and stays as bright as the ring. */}
      <Aurora accent={accent} encode />
    </Canvas>
  );
}
