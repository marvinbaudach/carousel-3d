import type { Texture } from 'three';

/** The nebula, pre-blurred: Aurora renders itself once per frame into a tiny
    buffer (desktop only) and publishes its texture here; the frost panes
    (FrostPlate) sample it in screen space. Upsampling 64px across the frame
    IS the heavy macOS blur — no transmission pass, no scene re-render. */
export const auroraBackdrop: { tex: Texture | null } = { tex: null };
