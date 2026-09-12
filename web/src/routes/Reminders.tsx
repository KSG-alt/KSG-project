import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReminderList } from '../components/ReminderList';
import { useStore } from '../lib/store';
import type { Route } from '../App';
import type { Severity } from '../lib/reminders';
import { OUTBOX_COPY } from '../lib/outbox';

type Filter = 'open' | 'safeguarding' | 'done' | 'all' | 'outbox';

export function Reminders({ onGo }: { onGo: (r: Route) => void }) {
  const { reminders, open, outbox } = useStore();
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
    { id: 'outbox', label: `Outbox ${outbox.length}` },
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

      {filter === 'outbox' ? (
        outbox.length === 0 ? (
          <p className="meta reminders__empty">
            Nothing drafted. Open a reminder and write the chase to put a
            message here.
          </p>
        ) : (
          <>
            <p className="meta section__lede">
              Drafted chases and what became of them. Queued is not sent —
              delivery needs a sending service the platform does not own yet, so
              the queue says so rather than implying a parent has been emailed.
            </p>
            <ul className="outbox stagger">
              {outbox.map((o) => (
                <li key={o.id} className="out">
                  <div className="out__head">
                    <span className={`mark ${OUTBOX_COPY[o.state].mark}`}>
                      {OUTBOX_COPY[o.state].label}
                    </span>
                    <span className="out__to">{o.to}</span>
                    <span className="meta out__when">
                      {o.channel} · {o.at}
                    </span>
                  </div>
                  <p className="out__subject">{o.subject}</p>
                  <pre className="out__body">{o.body}</pre>
                  {o.note && (
                    <p className={`mark ${o.state === 'failed' ? 'mark--critical' : 'mark--idle'}`}>
                      {o.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <ReminderList items={rows} onGo={onGo} />
      )}
    </>
  );
}
