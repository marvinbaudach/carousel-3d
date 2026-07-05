import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Carousel3D } from './components/Carousel3D';
import { PerfHud } from './components/PerfHud';
import { LoadingScreen } from './components/LoadingScreen';
import { GlobalStyle } from './GlobalStyle';
import { loadLiveData } from './data/sources';

// "Loading" is a staged boot sequence: it gives the pulse loader one full
// beat before the iris hands the screen center over to the blooming ring,
// while the live-data fetches race ahead in the background.
const BOOT_MS = 2400;

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
    // Fire off the public-API fetches and the price socket during the boot
    // beat, so most panels already hold real data when the ring blooms.
    loadLiveData();
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
