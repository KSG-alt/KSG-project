import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { selfCheck } from './lib/importCsv';
import { selfCheck as scheduleCheck } from './lib/schedule';
import { selfCheck as planCheck } from './lib/runplan';

/* The import parser is the one place a silent wrong answer moves a child's
   arrival date. It checks itself in dev; console.assert stays quiet when it
   passes and is stripped from the production bundle path anyway. */
if (import.meta.env.DEV) {
  selfCheck();
  scheduleCheck();
  planCheck();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
