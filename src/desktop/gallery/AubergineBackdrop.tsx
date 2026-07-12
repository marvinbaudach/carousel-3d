import styled from 'styled-components';

const Base = styled.div<{ $accent: string }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  --accent: ${(p) => p.$accent};
  background:
    radial-gradient(50% 65% at 84% 16%, color-mix(in oklab, var(--accent) 40%, transparent), transparent 60%),
    radial-gradient(60% 80% at 18% 12%, #7a1f6b, transparent 55%),
    radial-gradient(55% 70% at 88% 22%, #571b52, transparent 60%),
    radial-gradient(70% 90% at 72% 100%, #3d0f39, transparent 60%),
    linear-gradient(150deg, #2c001e, #1c0518 55%, #120311);
  background-size: 140% 140%;
  animation: aubergine-drift 28s ease-in-out infinite alternate;
  @keyframes aubergine-drift {
    from { background-position: 0% 0%, 0% 0%, 100% 100%, 60% 100%, 0 0; }
    to { background-position: 12% 8%, 18% 10%, 82% 88%, 48% 86%, 0 0; }
  }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export function AubergineBackdrop({ accent }: { accent: string }) {
  return <Base $accent={accent} aria-hidden />;
}
