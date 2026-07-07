import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  createDashboardTexture,
  type Dashboard,
  type DashboardTexture,
} from '../dashboards';

// Anisotropy requested for a dashboard texture: keeps the chart text legible
// when a panel is seen at a grazing angle on the ring, without paying for the
// driver's full (often 16x) filtering.
const MAX_ANISOTROPY = 8;

/**
 * Create and own a dashboard's canvas texture for a card's lifetime: it is
 * rasterised in its settled state at mount (see createDashboardTexture),
 * given anisotropic filtering, and disposed on unmount. Per-frame redrawing
 * (live ticks, the hero intro) stays with the caller. Memoised on
 * [dashboard, width, height], so only a genuine swap rebuilds the texture.
 */
export function useDashboardTexture(
  dashboard: Dashboard,
  width: number,
  height: number,
): DashboardTexture {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const dash = useMemo(
    () => createDashboardTexture(dashboard, width, height),
    [dashboard, width, height],
  );
  useEffect(() => {
    dash.tex.anisotropy = Math.min(MAX_ANISOTROPY, maxAnisotropy);
    return () => dash.dispose();
  }, [dash, maxAnisotropy]);
  return dash;
}
