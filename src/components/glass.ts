import { css } from 'styled-components';

// Shared glassmorphism surface for the GUI overlays (control bar, chips,
// buttons, HUD): a frosted, background-blurring pane with a bright top rim
// and a soft drop shadow. backdrop-filter blurs the 3D scene behind it, so
// the aurora reads through as diffuse color — the real frosted-glass look,
// and cheap since it's just DOM compositing.
export const glassSurface = css`
  background: rgba(14, 18, 28, 0.42);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
`;
