/* ── Ask Kadia, as a small window ─────────────────────────────────────────
   Closed it is a pill the width of its own words, sitting quietly at the
   right of whatever it belongs to. Open it becomes a card with the
   conversation in it and the automations this screen runs as one-click
   chips.

   The restraint is the design: a chat held open all day takes the best
   space on the screen and gives nothing back until somebody types in it, so
   closed it should read as a control, not a panel.
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

  if (!open) {
    return (
      <div className="dock dock--shut">
        <button
          className="dock__pill"
          onClick={() => setOpen(true)}
          title={`${title} — ${hint}`}
        >
          <span className="dock__spark">
            <IconKadia />
          </span>
          Ask Kadia
        </button>
      </div>
    );
  }

  return (
    <div className="dock dock--open">
      <div className="dock__bar">
        <span className="dock__spark">
          <IconKadia />
        </span>
        <span className="dock__title">{title}</span>
        <span className="dock__hint">{hint}</span>
        <button
          className="dock__close"
          onClick={() => setOpen(false)}
          aria-label="Close Ask Kadia"
        >
          <IconClose />
        </button>
      </div>

      <div className="dock__chips">
        {chips.map((c) => (
          <button key={c} className="dock__chip" title={c} onClick={() => onAsk(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="dock__body">{children}</div>
    </div>
  );
}
