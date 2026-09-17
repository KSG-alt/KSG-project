/* ── The small window ─────────────────────────────────────────────────────
   A chat panel that is always open takes the top of a screen and gives back
   nothing until somebody types in it. This is the opposite: one line at the
   top saying what it can do, a few chips for the automations this screen
   actually runs, and a window that opens when there is something to say.

   Clicking a chip opens it and asks for that automation in the same motion,
   so the common jobs are one click and the uncommon ones are a sentence.
   ──────────────────────────────────────────────────────────────────────── */

import { useState, type ReactNode } from 'react';
import { IconClose, IconKadia } from '../lib/icons';

export function AskDock({
  title,
  hint,
  chips,
  onAsk,
  children,
}: {
  title: string;
  hint: string;
  /* The automations this screen runs, in the words somebody would use. */
  chips: string[];
  onAsk: (text: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`dock${open ? ' dock--open' : ''}`}>
      <div className="dock__bar">
        <button
          className="dock__open"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <IconKadia />
          <span className="dock__title">{title}</span>
          <span className="meta dock__hint">{hint}</span>
        </button>

        {open && (
          <button
            className="btn btn--quiet dock__close"
            onClick={() => setOpen(false)}
            aria-label="Close Ask Kadia"
          >
            <IconClose />
          </button>
        )}
      </div>

      {!open && (
        <div className="dock__chips">
          {chips.map((c) => (
            <button
              key={c}
              className="dock__chip"
              onClick={() => {
                setOpen(true);
                onAsk(c);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Kept mounted once opened, so closing the window does not throw the
          conversation away. */}
      <div className="dock__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
