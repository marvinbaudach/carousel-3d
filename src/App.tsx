import { lazy, Suspense } from 'react';
import styled from 'styled-components';
import { GlobalStyle } from './GlobalStyle';
import { useIsMobile } from './hooks/useIsMobile';

const MobileApp = lazy(() => import('./mobile/MobileApp'));
const DesktopApp = lazy(() => import('./desktop/DesktopApp'));

const Stage = styled.main`
  position: fixed;
  inset: 0;
  background: #080b14;
  overflow: hidden;
  & canvas {
    display: block;
    touch-action: none;
  }
`;

export default function App() {
  const isMobile = useIsMobile();
  return (
    <Stage>
      <GlobalStyle />
      <Suspense fallback={null}>{isMobile ? <MobileApp /> : <DesktopApp />}</Suspense>
    </Stage>
  );
}
