import { useEffect, useRef } from 'react';
import { NAV, type Route } from '../App';
import { useStore } from '../lib/store';

export function MenuOverlay({
  route,
  onGo,
  onClose,
}: {
  route: Route;
  onGo: (r: Route) => void;
  onClose: () => void;
}) {
  const { open } = useStore();
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      /* Keep tab focus inside the sheet while it is up. */
      if (e.key !== 'Tab' || !panel.current) return;
      const stops = panel.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea',
      );
      if (!stops.length) return;
      const a = stops[0];
      const z = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const items: { id: Route; label: string }[] = [
    { id: 'home', label: 'home' },
    ...NAV.map((n) => ({ id: n.id, label: n.label.toLowerCase() })),
  ];

  const critical = open.filter((r) => r.severity === 'safeguarding').length;

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Sections"
      ref={panel}
    >
      <div className="sheet__top">
        <button
          ref={first}
          className="sheet__close"
          onClick={onClose}
          aria-label="Close menu"
        >
          close
        </button>
      </div>

      <nav className="sheet__nav">
        {items.map((item, i) => (
          <button
            key={item.id}
            className={`sheet__item${item.id === route ? ' sheet__item--on' : ''}`}
            style={{ animationDelay: `${40 + i * 38}ms` }}
            onClick={() => {
              onGo(item.id);
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.id === 'reminders' && open.length > 0 && (
              <span
                className={`sheet__count${critical ? ' sheet__count--critical' : ''}`}
              >
                {open.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sheet__foot">
        <button
          className="sheet__cta"
          onClick={() => {
            onGo('reminders');
            onClose();
          }}
        >
          {open.length > 0
            ? `${open.length} outstanding${critical ? ` · ${critical} safeguarding` : ''}`
            : 'Nothing outstanding'}
        </button>
        <button
          className="sheet__cta sheet__cta--quiet"
          onClick={() => {
            onGo('kadia');
            onClose();
          }}
        >
          Ask Kadia
        </button>
      </div>
    </div>
  );
}
