import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { selfCheck } from './lib/importCsv';
import { selfCheck as scheduleCheck } from './lib/schedule';
import { selfCheck as planCheck } from './lib/runplan';
import { selfCheck as venueCheck } from './data/venues';
import { selfCheck as roomCheck } from './lib/allocate';
import { selfCheck as transferCheck } from './lib/transfers';
import { selfCheck as chargeCheck } from './data/suppliers';
import { selfCheck as healthCheck } from './data/health';
import { selfCheck as coverCheck } from './lib/cover';

/* The import parser is the one place a silent wrong answer moves a child's
   arrival date. It checks itself in dev; console.assert stays quiet when it
   passes and is stripped from the production bundle path anyway. */
if (import.meta.env.DEV) {
  selfCheck();
  scheduleCheck();
  planCheck();
  venueCheck();
  roomCheck();
  transferCheck();
  chargeCheck();
  healthCheck();
  coverCheck();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
