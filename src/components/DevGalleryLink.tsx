import styled from 'styled-components';
import { glassSurface, controlGlow, ACCENT_TEXT, RADIUS } from './glass';

// Dev-only shortcut that toggles the in-app card review gallery (a single-page
// view that fades in over the ring — no page navigation, no state lost). The
// gallery itself is desktop-only and code-split behind import.meta.env.DEV, so
// this button and everything it opens never ship to production. App decides
// when to render it (desktop, dev, and only while the gallery is closed).
const Button = styled.button`
  position: fixed;
  left: 16px;
  top: calc(env(safe-area-inset-top, 0px) + 18px);
  z-index: 13;
  padding: 7px 12px;
  border-radius: ${RADIUS.control};
  color: ${ACCENT_TEXT};
  font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  cursor: pointer;
  opacity: 0.62;
  transition:
    opacity 0.14s ease,
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
  ${glassSurface}
  /* Shared accent glow (see controlGlow) — one reaction across every corner
     control. The launcher also rests dimmed and comes to full strength here. */
  ${controlGlow}

  &:hover,
  &:focus-visible {
    opacity: 1;
  }
`;

interface DevGalleryLinkProps {
  onOpen: () => void;
}

export function DevGalleryLink({ onOpen }: DevGalleryLinkProps) {
  if (!import.meta.env.DEV) return null;
  return (
    <Button type="button" onClick={onOpen} aria-label="Karten-Galerie öffnen (Dev)">
      ⧉ Gallery
    </Button>
  );
}
