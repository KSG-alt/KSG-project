import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { useStore } from '../lib/store';
import { CATEGORY_LABEL, toCsv, type AuditCategory } from '../lib/audit';

type Filter = AuditCategory | 'all';

const MARK: Record<AuditCategory, string> = {
  safeguarding: 'mark--critical',
  rota: 'mark--current',
  finance: 'mark--overdue',
  record: 'mark--idle',
};

export function Audit() {
  const { audit } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const rows = audit.filter((e) => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (!q) return true;
    return `${e.action} ${e.subject} ${e.detail} ${e.actor}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const counts = (c: AuditCategory) => audit.filter((e) => e.category === c).length;

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: `Everything ${audit.length}` },
    { id: 'safeguarding', label: `Safeguarding ${counts('safeguarding')}` },
    { id: 'rota', label: `Rota ${counts('rota')}` },
    { id: 'finance', label: `Finance ${counts('finance')}` },
    { id: 'record', label: `Record ${counts('record')}` },
  ];

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kadia-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <SectionHead title="Audit trail" count={`${audit.length} entries`}>
        <input
          className="field"
          style={{ width: 210 }}
          placeholder="Search the trail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the audit trail"
        />
        <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
      </SectionHead>

      <p className="meta section__lede">
        Every consequential action, timestamped and attributed. Entries are
        appended and never edited or removed — that is what makes it evidence.
        Anything you do in this demonstration is written here as you do it.
      </p>

      <div className="tabs" role="tablist" aria-label="Audit view">
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

      {rows.length === 0 ? (
        <p className="meta reminders__empty">
          Nothing in the trail matches {q ? `“${q}”` : 'this filter'}.
        </p>
      ) : (
        <ol className="trail stagger">
          {rows.map((e, i) => (
            <li
              key={e.id}
              className="trail__row"
              style={{ animationDelay: `${Math.min(i * 10, 220)}ms` }}
            >
              <time className="trail__at num" dateTime={e.at.replace(' ', 'T')}>
                {e.at}
              </time>
              <div className="trail__what">
                <span className={`mark ${MARK[e.category]}`}>
                  {CATEGORY_LABEL[e.category]}
                </span>
                <p className="trail__action">
                  {e.action} — <strong>{e.subject}</strong>
                </p>
                <p className="meta trail__detail">{e.detail}</p>
              </div>
              <span className="trail__who meta">{e.actor}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
