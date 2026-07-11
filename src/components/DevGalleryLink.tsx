import styled from 'styled-components';
import { glassSurface } from './glass';

// Dev-only shortcut from the running app to the card review gallery, so the
// two Vite entry points aren't split across separate commands. A plain <a> —
// gallery.html is its own entry point, so this is a real page navigation, not
// a route. Rendered only under import.meta.env.DEV, so it never ships to prod
// (where gallery.html isn't built anyway; Vite bundles only index.html).
const Link = styled.a`
  position: fixed;
  left: 16px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  z-index: 13;
  padding: 7px 12px;
  border-radius: 12px;
  color: #cfe4ff;
  font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  text-decoration: none;
  opacity: 0.62;
  transition:
    opacity 0.14s ease,
    transform 0.14s ease,
    border-color 0.14s ease;
  ${glassSurface}

  &:hover,
  &:focus-visible {
    opacity: 1;
    transform: translateY(-1px);
    border-color: rgba(122, 162, 255, 0.7);
    outline: none;
  }
`;

export function DevGalleryLink() {
  if (!import.meta.env.DEV) return null;
  return (
    <Link href="/gallery.html" aria-label="Karten-Galerie öffnen (Dev)">
      ⧉ Gallery
    </Link>
  );
}
