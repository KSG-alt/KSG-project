/* ── The small window ─────────────────────────────────────────────────────
   One slim line at the top of a screen: what it can be asked for, and the
   automations this screen actually runs. It opens when there is something to
   say and gets out of the way when there is not — a chat panel held open all
   day takes the best space on the screen and gives nothing back until
   somebody types in it.

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
          title={open ? 'Close Ask Kadia' : `${title} — ${hint}`}
        >
          <IconKadia />
          <span className="dock__title">{title}</span>
          {!open && <span className="dock__hint">{hint}</span>}
        </button>

        {!open &&
          chips.slice(0, 2).map((c) => (
            <button
              key={c}
              className="dock__chip"
              title={c}
              onClick={() => {
                setOpen(true);
                onAsk(c);
              }}
            >
              {c.length > 34 ? `${c.slice(0, 32)}…` : c}
            </button>
          ))}

        {open && (
          <button
            className="dock__close"
            onClick={() => setOpen(false)}
            aria-label="Close Ask Kadia"
          >
            <IconClose />
          </button>
        )}
      </div>

      {/* Kept mounted once opened, so closing the window does not throw the
          conversation away. */}
      <div className="dock__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
