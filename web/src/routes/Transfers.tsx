import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import {
  buildRuns, VEHICLES, WAIT_OPTIONS, type Run, type Wait,
} from '../lib/transfers';
import {
  AIRPORTS, airportBy, flightDay, mins, type Flight,
} from '../data/travel';
import { DEMO_TODAY, fmtDate, fmtDateLong, groupById } from '../data/seed';

type View = 'day' | 'flights' | 'season';

const STATUS: Record<Flight['status'], { label: string; mark: string }> = {
  scheduled: { label: 'Scheduled', mark: 'mark--idle' },
  landed: { label: 'Landed', mark: 'mark--clear' },
  delayed: { label: 'Delayed', mark: 'mark--overdue' },
  unknown: { label: 'No status', mark: 'mark--critical' },
};

export function Transfers() {
  const { students, staff, flights } = useStore();
  const [view, setView] = useState<View>('day');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait>(90);

  /* Every day anybody travels, so the busy ones can be picked out rather than
     hunted for. */
  const days = useMemo(() => {
    const counts = new Map<string, { in: number; out: number }>();
    students.forEach((s) => {
      const bump = (d: string, k: 'in' | 'out') => {
        const c = counts.get(d) ?? { in: 0, out: 0 };
        c[k] += 1;
        counts.set(d, c);
      };
      bump(s.arrival, 'in');
      bump(s.leaving, 'out');
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const nextChangeover = useMemo(() => {
    const today = `${DEMO_TODAY.getFullYear()}-${String(DEMO_TODAY.getMonth() + 1).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;
    const ahead = days.find(([d, c]) => d >= today && c.in + c.out > 4);
    return ahead?.[0] ?? days[0]?.[0] ?? today;
  }, [days]);

  const [day, setDay] = useState<string>(nextChangeover);

  const plan = useMemo(
    () => buildRuns(day, direction, students, staff, flights, wait),
    [day, direction, students, staff, flights, wait],
  );

  /* The same day at every tolerance, so the trade-off is a table rather than
     a number somebody has to take on trust. */
  const options = useMemo(
    () =>
      WAIT_OPTIONS.map((w) => ({
        wait: w,
        plan: buildRuns(day, direction, students, staff, flights, w),
      })),
    [day, direction, students, staff, flights],
  );

  const named = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s ? `${s.forename} ${s.surname}` : 'Unknown';
  };

  const tabs: { id: View; label: string }[] = [
    { id: 'day', label: `Runs ${plan.runs.length}` },
    { id: 'flights', label: 'Flights' },
    { id: 'season', label: `Changeover days ${days.filter(([, c]) => c.in + c.out > 4).length}` },
  ];

  return (
    <>
      <SectionHead
        title="Transfers"
        count={`${plan.studentsMoved} travelling · ${plan.runs.length} runs · ${plan.vehicleHours}h of vehicle time`}
      >
        <select
          className="field"
          style={{ width: 210 }}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Day"
        >
          {days
            .filter(([, c]) => c.in + c.out > 0)
            .map(([d, c]) => (
              <option key={d} value={d}>
                {fmtDateLong(d)} — {c.in} in, {c.out} out
              </option>
            ))}
        </select>
      </SectionHead>

      <p className="meta section__lede">
        Students land across the day in two peaks and every one of them has to
        be met by name. The runs below are built from the flights: one airport
        each, flights within 75 minutes sharing a vehicle, off-site ratios, a
        D1 holder on anything that needs one, and a named meeter on any run
        carrying an unaccompanied minor — the airline will not release a child
        to anybody else.
      </p>

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}
      {openStaff && <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />}

      <div className="tabs" role="tablist" aria-label="Transfer view">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            className={`tab${view === t.id ? ' tab--on' : ''}`}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {(['in', 'out'] as const).map((d) => (
          <button
            key={d}
            className={`tab${direction === d ? ' tab--on' : ''}`}
            onClick={() => setDirection(d)}
          >
            {d === 'in' ? 'Arrivals' : 'Departures'}
          </button>
        ))}
      </div>

      <div className="wait">
        <p className="label">How long may a student wait airside?</p>
        <p className="meta wait__lede">
          The longer they may wait with a staff member, the more flights share
          a vehicle. An hour is nothing to a seventeen-year-old and a long time
          for a nine-year-old on their own, so this is the centre&rsquo;s call,
          not the builder&rsquo;s.
        </p>
        <div className="wait__opts">
          {options.map((o) => (
            <button
              key={o.wait}
              className={`wait__opt${o.wait === wait ? ' wait__opt--on' : ''}`}
              onClick={() => setWait(o.wait)}
            >
              <span className="wait__n num">
                {o.wait === 0 ? 'None' : `${o.wait} min`}
              </span>
              <span className="meta">
                {o.plan.runs.length} runs · {o.plan.vehicleHours}h of vehicle
              </span>
              <span className="meta wait__save">
                {o.wait === 0
                  ? 'a vehicle per landing'
                  : `${options[0].plan.runs.length - o.plan.runs.length} fewer runs · ${(options[0].plan.vehicleHours - o.plan.vehicleHours).toFixed(1)}h saved`}
              </span>
            </button>
          ))}
        </div>
        <p className="meta wait__now">
          Longest anybody waits under this plan: {plan.longestWait} minutes.
        </p>
      </div>

      {plan.unmet.length > 0 && (
        <div className="alert alert--critical">
          <p className="label">{plan.unmet.length} runs cannot go as planned</p>
          <ul className="log">
            {plan.unmet.slice(0, 6).map((u, i) => (
              <li key={i}>
                <strong>{u.where}</strong> — {u.problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'day' && (
        plan.runs.length === 0 ? (
          <p className="meta reminders__empty">
            Nobody travels {direction === 'in' ? 'in' : 'out'} on {fmtDateLong(day)}.
          </p>
        ) : (
          <ul className="runs stagger">
            {plan.runs.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                named={named}
                onStudent={setOpenStudent}
                onStaff={setOpenStaff}
              />
            ))}
          </ul>
        )
      )}

      {view === 'flights' && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Student</th>
                <th>Flight</th>
                <th>Airport</th>
                <th>Terminal</th>
                <th>Lands</th>
                <th>Status</th>
                <th>Alone</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {students
                .map((s) => ({
                  s,
                  f: flights.find(
                    (x: Flight) => x.studentId === s.id && x.direction === direction,
                  ),
                }))
                .filter((x) => x.f && flightDay(x.s, x.f) === day)
                .sort((a, b) => mins(a.f!.at) - mins(b.f!.at))
                .map(({ s, f }) => (
                  <tr key={s.id}>
                    <td>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.country} · {s.age}
                      </span>
                    </td>
                    <td className="num">{f!.number}</td>
                    <td>{airportBy(f!.airport).name}</td>
                    <td className="num meta">{f!.terminal}</td>
                    <td className="num">
                      {f!.at}
                      {f!.delay > 0 && (
                        <span className="meta" style={{ display: 'block', color: 'var(--oxide)' }}>
                          +{f!.delay} min
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`mark ${STATUS[f!.status].mark}`}>
                        {STATUS[f!.status].label}
                      </span>
                    </td>
                    <td>
                      {f!.unaccompanied ? (
                        <span className="mark mark--overdue">Unaccompanied</span>
                      ) : (
                        <span className="meta" style={{ color: 'var(--ink-3)' }}>—</span>
                      )}
                    </td>
                    <td className="meta">{groupById(s.groupId).name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'season' && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th>Day</th>
                <th>Arriving</th>
                <th>Leaving</th>
                <th>Airports</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {days
                .filter(([, c]) => c.in + c.out > 4)
                .map(([d, c]) => {
                  const aps = new Set(
                    students
                      .filter((s) => s.arrival === d || s.leaving === d)
                      .map((s) => {
                        const f = flights.find(
                          (x: Flight) =>
                            x.studentId === s.id &&
                            x.direction === (s.arrival === d ? 'in' : 'out'),
                        );
                        return f ? airportBy(f.airport).name : '';
                      })
                      .filter(Boolean),
                  );
                  return (
                    <tr key={d}>
                      <td style={{ fontWeight: d === day ? 600 : 400 }}>{fmtDateLong(d)}</td>
                      <td className="num">{c.in}</td>
                      <td className="num">{c.out}</td>
                      <td className="meta">{[...aps].join(', ')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn" onClick={() => { setDay(d); setView('day'); }}>
                          Plan it
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function RunRow({
  run,
  named,
  onStudent,
  onStaff,
}: {
  run: Run;
  named: (id: string) => string;
  onStudent: (id: string) => void;
  onStaff: (id: string) => void;
}) {
  const { students } = useStore();
  const [open, setOpen] = useState(false);
  const ap = airportBy(run.airport);
  const load = run.studentIds
    .map((id) => students.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const short = run.staffIds.length < 2;

  return (
    <li className="run">
      <button className="run__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="run__leave num">
          {run.leaveCentre}
          <span className="meta">leave</span>
        </span>
        <span className="run__where">
          <span className="run__ap">{ap.name}</span>
          <span className="meta">
            {run.vehicle} · {run.studentIds.length}/{VEHICLES[run.vehicle].seats} seats ·{' '}
            {ap.minutes} min each way
          </span>
        </span>
        <span className="run__meet meta num">
          meet {run.meetFrom}
          {run.meetTo !== run.meetFrom ? `–${run.meetTo}` : ''}
        </span>
        <span className="run__marks">
          {run.unaccompanied > 0 && (
            <span className="mark mark--overdue">{run.unaccompanied} alone</span>
          )}
          {short ? (
            <span className="mark mark--critical">{run.staffIds.length} staff</span>
          ) : (
            <span className="mark mark--clear">{run.staffIds.length} staff</span>
          )}
        </span>
      </button>

      {open && (
        <div className="run__detail">
          <div className="inc__cols">
            <section>
              <p className="label">The run</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Leaves</dt>
                  <dd className="num">{run.leaveCentre} from the front drive</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Flights</dt>
                  <dd className="num">{run.flightNumbers.join(', ')}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Terminal</dt>
                  <dd>{ap.name} — check the board, terminals move</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Back by</dt>
                  <dd className="num">
                    about{' '}
                    {(() => {
                      const back = mins(run.meetTo) + 45 + ap.minutes;
                      return `${String(Math.floor(back / 60) % 24).padStart(2, '0')}:${String(back % 60).padStart(2, '0')}`;
                    })()}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <p className="label">Who is on it</p>
              {run.staffIds.length === 0 ? (
                <p className="mark mark--critical">Nobody assigned. This run cannot go.</p>
              ) : (
                <ul className="log">
                  {run.staffIds.map((id) => (
                    <li key={id}>
                      <button className="namebtn" onClick={() => onStaff(id)}>
                        {named(id)}
                      </button>
                      {id === run.meeterId && (
                        <span className="mark mark--clear" style={{ marginLeft: 8 }}>
                          Meets and signs
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {run.unaccompanied > 0 && (
                <p className="meta" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                  {run.unaccompanied} unaccompanied minors on this run. The
                  airline releases them only to the named adult above, with ID.
                </p>
              )}
            </section>

            <section>
              <p className="label">{load.length} students</p>
              <ul className="log">
                {load.slice(0, 10).map((s) => (
                  <li key={s.id}>
                    <button className="namebtn" onClick={() => onStudent(s.id)}>
                      {s.forename} {s.surname}
                    </button>
                    <span className="meta"> · {s.country} · {s.age}</span>
                  </li>
                ))}
                {load.length > 10 && (
                  <li className="meta">…and {load.length - 10} more</li>
                )}
              </ul>
            </section>
          </div>
        </div>
      )}
    </li>
  );
}
