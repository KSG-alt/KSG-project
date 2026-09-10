import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReadinessMark } from '../components/StudentReadiness';
import {
  daysFromToday, fmtDate, groupByArrival, groupById, readiness, roomLabel,
  upcomingArrivals, whenLabel,
} from '../data/seed';

type Window = 0 | 7 | -1;

export function Arrivals() {
  const [win, setWin] = useState<Window>(7);
  const [q, setQ] = useState('');

  const all = useMemo(() => upcomingArrivals(), []);

  const rows = all.filter((s) => {
    if (win !== -1 && daysFromToday(s.arrival) > win) return false;
    if (!q) return true;
    return `${s.forename} ${s.surname} ${s.country} ${groupById(s.groupId).name} ${roomLabel(s.roomId)}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const days = groupByArrival(rows);
  const blocked = rows.filter((s) => !readiness(s).ready);

  const within = (n: number) =>
    all.filter((s) => daysFromToday(s.arrival) <= n).length;

  const tabs: { id: Window; label: string }[] = [
    { id: 0, label: `Arriving today ${within(0)}` },
    { id: 7, label: `Next 7 days ${within(7)}` },
    { id: -1, label: `Rest of season ${all.length}` },
  ];

  return (
    <>
      <SectionHead
        title="New arrivals"
        count={`${all.length} still to arrive this season`}
      >
        <input
          className="field"
          style={{ width: 220 }}
          placeholder="Search name, country, room"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search arrivals"
        />
      </SectionHead>

      <p className="meta section__lede">
        Every student still to come, by the day they land. A student is
        <strong> not ready</strong> if they have no bed or a missing medical or
        consent form — both are safeguarding, and both have to clear before they
        walk in. Everything else is a watch, not a block.
      </p>

      <div className="tabs" role="tablist" aria-label="Arrival window">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={win === t.id}
            className={`tab${win === t.id ? ' tab--on' : ''}`}
            onClick={() => setWin(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {blocked.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 22 }}>
          {blocked.length} of {rows.length} arriving in this window cannot be
          admitted yet
        </p>
      )}

      {days.length === 0 ? (
        <p className="meta reminders__empty">
          No arrivals in this window{q ? ` matching “${q}”` : ''}.
        </p>
      ) : (
        <div className="arrivals stagger">
          {days.map(([date, list], di) => (
            <section
              key={date}
              className="day"
              style={{ animationDelay: `${Math.min(di * 40, 240)}ms` }}
            >
              <div className="day__head">
                <h2 className="day__date">
                  {new Date(date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h2>
                <span className="meta day__when">
                  {whenLabel(date)} · {list.length} arriving
                </span>
              </div>

              <div className="tablewrap">
                <table className="reg">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Student</th>
                      <th>Age</th>
                      <th>Group</th>
                      <th>Room</th>
                      <th>Bed</th>
                      <th>Leaves</th>
                      <th style={{ width: '18%' }}>Guardian</th>
                      <th style={{ width: '20%' }}>Admission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>
                            {s.forename} {s.surname}
                          </span>
                          <span
                            className="meta"
                            style={{ display: 'block', color: 'var(--ink-3)' }}
                          >
                            {s.country} · {s.band}
                          </span>
                        </td>
                        <td className="num">{s.age}</td>
                        <td>{groupById(s.groupId).name}</td>
                        <td>
                          {s.roomId ? (
                            roomLabel(s.roomId)
                          ) : (
                            <span className="mark mark--critical">None</span>
                          )}
                        </td>
                        <td className="num">{s.bed || '—'}</td>
                        <td className="num">{fmtDate(s.leaving)}</td>
                        <td>
                          {s.guardian.name}
                          <span
                            className="meta"
                            style={{ display: 'block', color: 'var(--ink-3)' }}
                          >
                            {s.guardian.phone}
                          </span>
                        </td>
                        <td>
                          <ReadinessMark s={s} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
