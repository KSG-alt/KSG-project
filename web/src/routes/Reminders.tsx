import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReminderList } from '../components/ReminderList';
import { useStore } from '../lib/store';
import type { Route } from '../App';
import type { Severity } from '../lib/reminders';

type Filter = 'open' | 'safeguarding' | 'done' | 'all';

export function Reminders({ onGo }: { onGo: (r: Route) => void }) {
  const { reminders, open } = useStore();
  const [filter, setFilter] = useState<Filter>('open');

  const counts: Record<Severity, number> = {
    safeguarding: open.filter((r) => r.severity === 'safeguarding').length,
    overdue: open.filter((r) => r.severity === 'overdue').length,
    admin: open.filter((r) => r.severity === 'admin').length,
  };

  const rows = reminders.filter((r) => {
    if (filter === 'open') return !r.done;
    if (filter === 'safeguarding') return !r.done && r.severity === 'safeguarding';
    if (filter === 'done') return Boolean(r.done);
    return true;
  });

  const tabs: { id: Filter; label: string }[] = [
    { id: 'open', label: `Outstanding ${open.length}` },
    { id: 'safeguarding', label: `Safeguarding ${counts.safeguarding}` },
    { id: 'done', label: `Done ${reminders.length - open.length}` },
    { id: 'all', label: 'Everything' },
  ];

  return (
    <>
      <SectionHead
        title="Reminders"
        count={`${open.length} outstanding · ${counts.safeguarding} safeguarding · ${counts.overdue} overdue · ${counts.admin} admin`}
      />

      <p className="meta section__lede">
        Every row is a real outstanding thing in the records below — a document
        that has not arrived, a check that cannot be rota&rsquo;d, a booking with
        no receipt, a session under ratio. Nothing here is invented. Complete
        opens the screen where the work is done.
      </p>

      <div className="tabs" role="tablist" aria-label="Reminder view">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            className={`tab${filter === t.id ? ' tab--on' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReminderList items={rows} onGo={onGo} />
    </>
  );
}
