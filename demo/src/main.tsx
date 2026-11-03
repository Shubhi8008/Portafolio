import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/roboto-mono/400.css';
import './styles.css';
import './pullup.css';
import './site.css';

// wait for webfonts so glyph positions are measured against the final font
const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
const ready = fonts ? Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))]) : Promise.resolve();

ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
