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
