import { createGlobalStyle } from 'styled-components';

// Global reset + page shell (replaces the former index.css).
export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    margin: 0;
    height: 100%;
    background: #080b14;
  }

  html {
    /* Kill the mobile browser's gray tap overlay — it flashes over whole
       gesture surfaces (the swipe card) instead of the control actually
       tapped. Buttons carry their own :active feedback instead. */
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family:
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
`;
