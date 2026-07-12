import styled from 'styled-components';

const Track = styled.div<{ $hidden: boolean }>`
  position: fixed;
  inset: 0 0 auto;
  height: 2px;
  z-index: 20;
  opacity: ${(p) => (p.$hidden ? 0 : 1)};
  transition: opacity 400ms ease 200ms;
  pointer-events: none;
`;
const Fill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, #7a1f6b, #b5432f);
  transition: width 240ms ease;
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export function ProgressBar({ pct }: { pct: number }) {
  return <Track $hidden={pct >= 100} aria-hidden><Fill $pct={pct} /></Track>;
}
