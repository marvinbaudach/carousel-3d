import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Carousel3D } from './components/Carousel3D';
import { PerfHud } from './components/PerfHud';
import { LoadingScreen } from './components/LoadingScreen';
import { GlobalStyle } from './GlobalStyle';

// The dashboards are generated locally (no assets to fetch), so "loading" is
// a staged boot sequence that gives the pulse loader one full beat before the
// iris hands the screen center over to the blooming ring.
const BOOT_MS = 1600;

const Stage = styled.main`
  position: fixed;
  inset: 0;
  background: #05070c;
  overflow: hidden;

  & canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
    touch-action: none; /* drag must not collide with page scroll */
  }
`;

export default function App() {
  const [done, setDone] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), BOOT_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <Stage>
      <GlobalStyle />
      {done && <Carousel3D />}
      <PerfHud />

      {showLoader && (
        <LoadingScreen done={done} onExited={() => setShowLoader(false)} />
      )}
    </Stage>
  );
}
