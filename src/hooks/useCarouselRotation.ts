import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';

interface Options {
  /** Constant idle rotation in radians/second. */
  autoSpin?: number;
  /** Pixel -> radians conversion while dragging. */
  dragSensitivity?: number;
  /** Friction per frame (0..1); higher = faster roll-out. */
  friction?: number;
  /** Wheel-delta -> angular velocity conversion. */
  wheelSensitivity?: number;
  /** When it returns true the ring holds still (e.g. a hero card is open). */
  paused?: () => boolean;
}

// Beyond this pixel movement a gesture counts as a drag, not a click.
const CLICK_THRESHOLD = 6;

/**
 * Drives the Y rotation of the ring group.
 *
 * The whole animation runs in `useFrame` (R3F's rAF) and writes directly to
 * `group.rotation.y` — no React state per frame, hence no stutter.
 * Modes: drag with inertia, mouse wheel and idle auto-spin. `wasDrag()` lets
 * callers tell a real click apart from the end of a drag.
 */
export function useCarouselRotation({
  autoSpin = 0.12,
  dragSensitivity = 0.005,
  friction = 0.06,
  wheelSensitivity = 0.0016,
  paused,
}: Options = {}) {
  const groupRef = useRef<Group>(null);
  const gl = useThree((s) => s.gl);

  // State kept in refs so re-renders never touch the animation.
  const rotation = useRef(0);
  const velocity = useRef(autoSpin);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastMoveTime = useRef(0);
  const moved = useRef(0);
  // Keep the latest `paused` callback so listeners never capture a stale one.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      moved.current = 0;
      lastX.current = e.clientX;
      lastMoveTime.current = performance.now();
      velocity.current = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      const dx = e.clientX - lastX.current;
      const dt = Math.max((now - lastMoveTime.current) / 1000, 1 / 240);

      moved.current += Math.abs(dx);
      const deltaAngle = dx * dragSensitivity;
      rotation.current += deltaAngle;
      // Remember instantaneous velocity for the later roll-out.
      velocity.current = deltaAngle / dt;

      lastX.current = e.clientX;
      lastMoveTime.current = now;
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (pausedRef.current?.()) return; // a hero card owns the wheel while open
      velocity.current += e.deltaY * wheelSensitivity;
    };

    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      el.style.cursor = '';
    };
  }, [gl, dragSensitivity, wheelSensitivity]);

  /** True when the last gesture moved far enough to count as a drag. */
  const wasDrag = () => moved.current > CLICK_THRESHOLD;

  useFrame((_, delta) => {
    // Clamp delta so a dropped frame does not cause a jump.
    const dt = Math.min(delta, 1 / 30);

    // Hold still while a hero card is open, but keep the current angle.
    if (pausedRef.current?.()) return;

    if (!dragging.current) {
      rotation.current += velocity.current * dt;
      // Ease velocity toward the auto-spin (inertia -> idle).
      velocity.current += (autoSpin - velocity.current) * friction;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = rotation.current;
    }
  });

  return { groupRef, wasDrag };
}
