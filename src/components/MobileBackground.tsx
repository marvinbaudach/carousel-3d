import type { Ref } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

// CSS counterpart of the desktop aurora: the mobile path has no WebGL, so the
// "room changes mood" read comes from two big radial-gradient blobs drifting
// via transform (compositor-only, no per-frame JS). The tint is a registered
// CSS custom property (@property with a <color> syntax), so the browser can
// interpolate the color itself and the gradient crossfades on theme switch;
// engines without @property fall back to an instant snap, which is fine.
const AccentProperty = createGlobalStyle`
  @property --wp-accent {
    syntax: '<color>';
    inherits: true;
    initial-value: #3987e5;
  }
`;

const driftA = keyframes`
  0% { transform: translate(-14%, -10%) scale(2); }
  50% { transform: translate(8%, 4%) scale(2.36); }
  100% { transform: translate(-14%, -10%) scale(2); }
`;

const driftB = keyframes`
  0% { transform: translate(10%, 12%) scale(2.2); }
  50% { transform: translate(-6%, -4%) scale(1.9); }
  100% { transform: translate(10%, 12%) scale(2.2); }
`;

const Layer = styled.div<{ $accent: string }>`
  position: fixed;
  inset: 0;
  z-index: -1; /* under the deck's static children, above the stage bg */
  overflow: hidden;
  pointer-events: none;
  /* The accent value lives here so both blobs inherit it. */
  --wp-accent: ${(p) => p.$accent};
`;

const Blob = styled.div`
  position: absolute;
  width: 45vmax;
  height: 45vmax;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, var(--wp-accent), transparent 62%);
  opacity: 0.14;
  will-change: transform;
  /* Base scale matches the keyframes' range, so the reduced-motion resting
     pose (animation off, base transform applies) keeps the full-size glow. */
  transform: scale(2);
  transition: --wp-accent 1.2s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const BlobA = styled(Blob)`
  top: -15vmax;
  left: -12vmax;
  animation: ${driftA} 28s ease-in-out infinite;
`;

const BlobB = styled(Blob)`
  right: -15vmax;
  bottom: -18vmax;
  opacity: 0.1;
  animation: ${driftB} 36s ease-in-out infinite;
`;

interface MobileBackgroundProps {
  /** Active theme accent (TAGS[].accent). */
  accent: string;
  ref?: Ref<HTMLDivElement>;
}

/** Slow, theme-tinted glow behind the mobile deck. The ref wraps the whole
    layer so the gyro parallax (Task 7) can shift it against the cards. */
export function MobileBackground({ accent, ref }: MobileBackgroundProps) {
  return (
    <Layer ref={ref} $accent={accent}>
      <AccentProperty />
      <BlobA />
      <BlobB />
    </Layer>
  );
}
