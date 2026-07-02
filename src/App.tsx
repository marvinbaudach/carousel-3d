import { useState } from 'react';
import styled from 'styled-components';
import { Carousel3D } from './components/Carousel3D';
import { LoadingScreen } from './components/LoadingScreen';
import { GlobalStyle } from './GlobalStyle';
import { useImagePreloader } from './hooks/useImagePreloader';
import { IMAGES } from './data/images';

const IMAGE_URLS = IMAGES.map((img) => img.url);

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
  const { progress, done } = useImagePreloader(IMAGE_URLS);
  const [showLoader, setShowLoader] = useState(true);
  // Mount the carousel only once images are cached -> no stutter.
  const [mountScene, setMountScene] = useState(false);

  if (done && !mountScene) setMountScene(true);

  return (
    <Stage>
      <GlobalStyle />
      {mountScene && <Carousel3D />}

      {showLoader && (
        <LoadingScreen
          progress={progress}
          done={done}
          onExited={() => setShowLoader(false)}
        />
      )}
    </Stage>
  );
}
