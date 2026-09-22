import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { useStore } from '../lib/store';
import {
  DEMO_TODAY, SEASON_END, SEASON_START, fmtDate, groupById,
  isOnSite, nights, roomLabel, type DocState, type Student,
} from '../data/seed';
import { Lede } from '../components/Lede';

type Filter = 'onsite' | 'arriving' | 'leaving' | 'all';

const SPAN = SEASON_END.getTime() - SEASON_START.getTime();

function StayBar({ s }: { s: Student }) {
  const a = new Date(s.arrival).getTime();
  const l = new Date(s.leaving).getTime();
  const left = ((a - SEASON_START.getTime()) / SPAN) * 100;
  const width = ((l - a) / SPAN) * 100;
  const now = ((DEMO_TODAY.getTime() - SEASON_START.getTime()) / SPAN) * 100;
  const here = isOnSite(s);
  return (
    <span className="stay" title={`${fmtDate(s.arrival)} to ${fmtDate(s.leaving)}`}>
      <span
        className="stay__span"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 1.5)}%`,
          background: here ? 'var(--ink)' : 'var(--ink-3)',
        }}
      />
      <span className="stay__now" style={{ left: `${now}%` }} />
    </span>
  );
}

const docLabel: Record<DocState, string> = {
  in: 'Complete',
  outstanding: 'Outstanding',
  overdue: 'Overdue',
};

function DocMark({ s }: { s: Student }) {
  const states = Object.values(s.docs);
  const overdue = states.filter((d) => d === 'overdue').length;
  const outstanding = states.filter((d) => d === 'outstanding').length;
  if (overdue) {
    return (
      <span className="mark mark--overdue">
        {overdue} overdue
      </span>
    );
  }
  if (outstanding) {
    return <span className="mark mark--idle">{outstanding} outstanding</span>;
  }
  return <span className="mark mark--clear">Complete</span>;
}

export function Students() {
  const { students: STUDENTS, reminders } = useStore();
  const [filter, setFilter] = useState<Filter>('onsite');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const soon = new Date(DEMO_TODAY);
    soon.setDate(soon.getDate() + 7);
    return STUDENTS.filter((s) => {
      if (q) {
        const hay = `${s.forename} ${s.surname} ${s.country} ${groupById(s.groupId).name}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (filter === 'onsite') return isOnSite(s);
      if (filter === 'arriving')
        return new Date(s.arrival) > DEMO_TODAY && new Date(s.arrival) <= soon;
      if (filter === 'leaving')
        return isOnSite(s) && new Date(s.leaving) <= soon;
      return true;
    }).sort((a, b) => a.arrival.localeCompare(b.arrival) || a.surname.localeCompare(b.surname));
  }, [filter, q, STUDENTS]);

  const tabs: { id: Filter; label: string }[] = [
    { id: 'onsite', label: 'On site now' },
    { id: 'arriving', label: 'Arriving in 7 days' },
    { id: 'leaving', label: 'Leaving in 7 days' },
    { id: 'all', label: 'Whole season' },
  ];

  return (
    <>
      <SectionHead
        title="Students"
        count={`${rows.length} shown · ${STUDENTS.length} in season · ${
          reminders.filter((r) => !r.done && r.route === 'students').length
        } outstanding against a student`}
      >
        <input
          className="field"
          style={{ width: 210 }}
          placeholder="Search name, country, group"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search students"
        />
      </SectionHead>

      <Lede>
        Open any name for the whole record — stay, room, guardian, their week on
        the rota, money, and everything logged against them.
      </Lede>

      {open && <StudentProfile id={open} onClose={() => setOpen(null)} />}

      <div className="tabs" role="tablist" aria-label="Student view">
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
        <p className="meta" style={{ padding: '38px 0' }}>
          No student matches “{q}” in this view. Clear the search, or switch to
          Whole season.
        </p>
      ) : (
        <div className="tablewrap">
        <table className="reg">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Name</th>
              <th>Age</th>
              <th>Group</th>
              <th>Arrival</th>
              <th>Leaving</th>
              <th>Nights</th>
              <th style={{ width: '16%' }}>Stay</th>
              <th>Room</th>
              <th>Documents</th>
              <th />
            </tr>
          </thead>
          <tbody className="stagger">
            {rows.slice(0, 60).map((s, i) => (
              <tr
                key={s.id}
                style={{ animationDelay: `${Math.min(i * 12, 260)}ms` }}
              >
                <td>
                  <button className="namebtn" onClick={() => setOpen(s.id)}>
                    {s.forename} {s.surname}
                  </button>
                  <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                    {s.country}
                  </span>
                </td>
                <td className="num">{s.age}</td>
                <td>{groupById(s.groupId).name}</td>
                <td className="num">{fmtDate(s.arrival)}</td>
                <td className="num">{fmtDate(s.leaving)}</td>
                <td className="num" style={{ color: 'var(--ink-2)' }}>{nights(s)}</td>
                <td><StayBar s={s} /></td>
                <td className="meta">
                  {s.roomId ? roomLabel(s.roomId) : (
                    <span className="mark mark--overdue">None</span>
                  )}
                </td>
                <td><DocMark s={s} /></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn" onClick={() => setOpen(s.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {rows.length > 60 && (
        <p className="meta" style={{ marginTop: 18, color: 'var(--ink-3)' }}>
          Showing the first 60 of {rows.length}. Narrow with search or a view above.
        </p>
      )}
    </>
  );
}
