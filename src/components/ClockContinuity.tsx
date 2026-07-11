import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Keep `state.clock.elapsedTime` monotonic across a frameloop pause.
 *
 * When the dev gallery takes the screen, Carousel3D switches the Canvas to
 * `frameloop="never"`; leaving it switches back to `"always"`. R3F's
 * `setFrameloop` resets `clock.elapsedTime = 0` on that resume (see
 * @react-three/fiber's store), so time appears to jump backward to zero.
 *
 * Every one-shot, absolute-time animation gate in the scene (CarouselItem's
 * entrance/exit, the ring's assemble swirl, Afterglow, the hero entrance)
 * stores an `elapsedTime` timestamp and drives `(now - start) / duration`.
 * After the reset those starts sit in the "future", so panels compute a
 * negative progress and hide themselves (`setCard(0)`) until `now` climbs back
 * past them — up to tens of seconds when a start was captured after a theme
 * switch. The visible result: the ring returns from the gallery empty.
 *
 * Three's `elapsedTime` is a plain running accumulator (`+= delta` each frame)
 * that R3F only ever *resets*, never rewinds mid-run. So detecting the single
 * downward jump and re-adding the time accrued before it restores continuity;
 * R3F's own `+= delta` then keeps counting from the corrected value. Mounted as
 * the first Canvas child so this runs before any consumer reads the clock.
 */
export function ClockContinuity() {
  // The last elapsedTime we handed downstream — the monotonic value, not the
  // raw one, so a reset always reads as a jump below it.
  const prev = useRef(0);

  useFrame((state) => {
    const clock = state.clock;
    const raw = clock.elapsedTime;
    // Reset detected: R3F zeroed the clock on resume. Shove elapsedTime back up
    // by the time we'd already counted, so downstream gates never see a rewind.
    if (raw + 1e-6 < prev.current) clock.elapsedTime = prev.current + raw;
    prev.current = clock.elapsedTime;
  });

  return null;
}
