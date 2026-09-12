import { useEffect, useRef } from 'react';
import { IconClose } from '../lib/icons';

/* A record opened from anywhere. A profile has to be reachable from the
   register, the arrivals list, a room, the rota and an incident — five
   screens with five different layouts — so it opens over them rather than
   inside any one of them. Not a modal for a task: a modal for a record, which
   is the case where the interruption IS the point. */
export function Drawer({
  title,
  sub,
  tag,
  onClose,
  children,
  foot,
}: {
  title: string;
  sub?: React.ReactNode;
  tag?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const stops = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
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
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
      prevFocus?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
      >
        <header className="drawer__head">
          <div className="drawer__id">
            <h2 className="drawer__title">{title}</h2>
            {sub && <p className="meta drawer__sub">{sub}</p>}
          </div>
          <div className="drawer__headright">
            {tag}
            <button
              className="btn btn--quiet"
              onClick={onClose}
              aria-label="Close record"
            >
              <IconClose />
            </button>
          </div>
        </header>

        <div className="drawer__body">{children}</div>

        {foot && <footer className="drawer__foot">{foot}</footer>}
      </div>
    </>
  );
}

/* Tabs inside a record. Same vocabulary as the register's tabs, smaller. */
export function DrawerTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="drawer__tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          className={`drawer__tab${value === t.id ? ' drawer__tab--on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
