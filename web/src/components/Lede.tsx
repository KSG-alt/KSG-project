/* ── The section's opening line ───────────────────────────────────────────
   Every section explains itself in a paragraph, and every one of those
   paragraphs is worth reading once. None of them is worth reading on the
   four hundredth visit, and an operator working a queue meets them four
   hundred times — so the first two lines stay and the rest is one click
   away. Nothing is cut; the wall is.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Lede({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Measure after layout, again once the face has loaded, and on every
       resize: whether two lines hold the paragraph depends on the width and
       on which font is actually rendering. */
    const measure = () =>
      setClipped(el.scrollHeight > el.clientHeight + 2);
    const frame = requestAnimationFrame(measure);
    const late = window.setTimeout(measure, 400);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className="lede">
      <p
        ref={ref}
        className={`meta section__lede${open ? ' section__lede--open' : ''}`}
      >
        {children}
      </p>
      {clipped && (
        <button
          className="lede__more"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}
