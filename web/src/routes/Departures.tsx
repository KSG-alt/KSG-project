/* ── Departures ───────────────────────────────────────────────────────────
   The mirror of New arrivals, and the half a centre forgets it needs until
   the morning it does. Arrivals are a queue of people to meet; departures are
   a queue of people to get out of the door, each on a flight somebody else
   decided, each with a bag, a bed to vacate and a balance nobody chases once
   they have gone.

   Every child on this screen carries their whole journey: which vehicle, what
   time it leaves the front drive, who is driving it, which airport and
   terminal, what time the desk wants them, the flight itself, and the
   references that make it findable when something goes wrong — the supplier's
   booking reference, the vehicle registration, the invoice line.

   The runs are the same builder the transfers screen uses. One plan, read two
   ways: by vehicle over there, by child here.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import { buildRuns, chargeOf, type Run } from '../lib/transfers';
import { agentFor } from '../data/suppliers';
import {
  BEFORE_DEPARTURE, airportBy, flightFor, mins, type Flight,
} from '../data/travel';
import { owed } from '../data/finance';
import {
  DEMO_TODAY, daysFromToday, fmtDate, fmtDateLong, fmtMoney, groupById,
  roomLabel, whenLabel, type Student,
} from '../data/seed';

type Window = 0 | 7 | -1 | -2;

const TODAY_ISO = (() => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${DEMO_TODAY.getFullYear()}-${p(DEMO_TODAY.getMonth() + 1)}-${p(DEMO_TODAY.getDate())}`;
})();

const clock = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function Departures() {
  const { students, staff, flights } = useStore();
  const [win, setWin] = useState<Window>(7);
  const [day, setDay] = useState<string>('');
  const [q, setQ] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  /* Everybody who still has to leave, soonest first. Whole season includes
     the ones who have already gone — a centre reconciles those too. */
  const leaving = useMemo(
    () =>
      [...students]
        .filter((s) => win === -2 || daysFromToday(s.leaving) >= 0)
        .sort((a, b) => a.leaving.localeCompare(b.leaving)),
    [students, win],
  );

  const inWindow = leaving.filter(
    (s) => !(win >= 0 && daysFromToday(s.leaving) > win),
  );

  const dayOptions = useMemo(() => {
    const map = new Map<string, Student[]>();
    inWindow.forEach((s) => map.set(s.leaving, [...(map.get(s.leaving) ?? []), s]));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [inWindow]);

  useEffect(() => {
    if (day && !dayOptions.some(([d]) => d === day)) setDay('');
  }, [day, dayOptions]);

  const rows = inWindow.filter((s) => {
    if (day && s.leaving !== day) return false;
    if (!q) return true;
    const f = flightFor(flights, s.id, 'out');
    return `${s.forename} ${s.surname} ${s.country} ${groupById(s.groupId).name} ${f?.number ?? ''} ${f ? airportBy(f.airport).name : ''}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const days = useMemo(() => {
    const map = new Map<string, Student[]>();
    rows.forEach((s) => map.set(s.leaving, [...(map.get(s.leaving) ?? []), s]));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  /* The vehicle runs for every day on screen, built once. A child's journey
     is a row in one of them. */
  const runsByDay = useMemo(() => {
    const out = new Map<string, Run[]>();
    days.forEach(([d]) => {
      out.set(d, buildRuns(d, 'out', students, staff, flights).runs);
    });
    return out;
  }, [days, students, staff, flights]);

  const runFor = (s: Student) =>
    (runsByDay.get(s.leaving) ?? []).find((r) => r.studentIds.includes(s.id)) ?? null;

  const named = (id: string) => {
    const x = staff.find((p) => p.id === id);
    return x ? `${x.forename} ${x.surname}` : 'Unknown';
  };

  const within = (n: number) =>
    students.filter(
      (s) => daysFromToday(s.leaving) >= 0 && daysFromToday(s.leaving) <= n,
    ).length;

  const stillToGo = students.filter((s) => daysFromToday(s.leaving) >= 0).length;

  const tabs: { id: Window; label: string }[] = [
    { id: 0, label: `Leaving today ${within(0)}` },
    { id: 7, label: `Next 7 days ${within(7)}` },
    { id: -1, label: `Still to go ${stillToGo}` },
    { id: -2, label: `Whole season ${students.length}` },
  ];

  /* What stops a child leaving cleanly: no flight on the record, no seat on
     any run, or money still owed that nobody will collect afterwards. */
  const unseated = rows.filter((s) => flightFor(flights, s.id, 'out') && !runFor(s));
  const noFlight = rows.filter((s) => !flightFor(flights, s.id, 'out'));
  const owing = rows.filter((s) => owed(s) > 0);

  return (
    <>
      <SectionHead
        title="Departures"
        count={
          day
            ? `${rows.length} leaving ${fmtDate(day)} · ${rows.filter((s) => owed(s) > 0).length} still owing`
            : `${stillToGo} still to go this season`
        }
      >
        <select
          className="field"
          style={{ width: 230 }}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Filter by departure day"
        >
          <option value="">Every departure day · {inWindow.length} students</option>
          {dayOptions.map(([d, list]) => (
            <option key={d} value={d}>
              {new Date(d).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
              {' — '}
              {list.length} leaving
            </option>
          ))}
        </select>
        <input
          className="field"
          style={{ width: 200 }}
          placeholder="Search name, flight, airport"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search departures"
        />
      </SectionHead>

      <p className="meta section__lede">
        Every child still to go, by the day they fly, with the whole journey
        against their name: the vehicle, the time it leaves the front drive,
        who is driving, the terminal, the desk time and the flight. The runs
        are the same ones the transfers screen builds — one plan, read by child
        here and by vehicle there.
      </p>

      {noFlight.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 12 }}>
          {noFlight.length} student{noFlight.length === 1 ? ' has' : 's have'} no
          outbound flight on the record. Nothing can be planned around them until
          the agent sends it.
        </p>
      )}
      {unseated.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 12 }}>
          {unseated.length} have a flight and no seat on any vehicle. Check the
          transfers screen for the day.
        </p>
      )}
      {owing.length > 0 && (
        <p className="mark mark--overdue" style={{ marginBottom: 22 }}>
          {owing.length} leaving with a balance outstanding —{' '}
          {fmtMoney(owing.reduce((n, s) => n + owed(s), 0))} in total. After the
          coach goes it is a debt, not a balance.
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Departure window">
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

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}
      {openStaff && <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />}

      {days.length === 0 ? (
        <p className="meta reminders__empty">
          Nobody leaves {day ? `on ${fmtDate(day)}` : 'in this window'}
          {q ? ` matching “${q}”` : ''}.
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
                  {whenLabel(date)} · {list.length} leaving ·{' '}
                  {(runsByDay.get(date) ?? []).length} vehicle runs
                </span>
              </div>

              <ul className="runs">
                {list.map((s) => {
                  const f = flightFor(flights, s.id, 'out');
                  const run = runFor(s);
                  const charge = run ? chargeOf(run) : null;
                  const ap = f ? airportBy(f.airport) : null;
                  const agent = agentFor(s);
                  const due = owed(s);
                  const isOpen = openRow === s.id;
                  const desk = f ? clock(Math.max(0, mins(f.at) - BEFORE_DEPARTURE)) : null;

                  return (
                    <li key={s.id} className="run">
                      <button
                        className="run__row"
                        onClick={() => setOpenRow(isOpen ? null : s.id)}
                        aria-expanded={isOpen}
                      >
                        <span className="run__leave num">
                          {run ? run.leaveCentre : '—'}
                          <span className="meta">leaves</span>
                        </span>
                        <span className="run__where">
                          <span className="run__ap">
                            {s.forename} {s.surname}
                          </span>
                          <span className="meta">
                            {groupById(s.groupId).name} · {s.age} · {s.country} ·{' '}
                            {roomLabel(s.roomId)}
                          </span>
                        </span>
                        <span className="run__meet meta num">
                          {f ? `${f.number} · ${ap!.name} ${f.at}` : 'no flight'}
                        </span>
                        <span className="run__marks">
                          {f?.unaccompanied && (
                            <span className="mark mark--overdue">Alone</span>
                          )}
                          {due > 0 && (
                            <span className="mark mark--critical">{fmtMoney(due)}</span>
                          )}
                          {run ? (
                            <span className="mark mark--clear">{run.vehicle}</span>
                          ) : (
                            <span className="mark mark--critical">No seat</span>
                          )}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="run__detail">
                          <div className="inc__cols">
                            <section>
                              <p className="label">The journey</p>
                              {!f ? (
                                <p className="meta">
                                  No outbound flight on the record. The agent has
                                  not sent it, and nothing downstream can be
                                  planned until they do.
                                </p>
                              ) : (
                                <dl className="pairs">
                                  <div className="pairs__pair">
                                    <dt>Leaves the centre</dt>
                                    <dd className="num">
                                      {run ? `${run.leaveCentre} from the front drive` : 'no vehicle'}
                                    </dd>
                                  </div>
                                  <div className="pairs__pair">
                                    <dt>Road time</dt>
                                    <dd className="num">
                                      {ap!.minutes} minutes to {ap!.name}, with traffic
                                    </dd>
                                  </div>
                                  <div className="pairs__pair">
                                    <dt>At the desk</dt>
                                    <dd className="num">
                                      {desk} — two and a half hours before the flight
                                    </dd>
                                  </div>
                                  <div className="pairs__pair">
                                    <dt>Flight</dt>
                                    <dd className="num">
                                      {f.number} · {ap!.name} terminal {f.terminal} ·{' '}
                                      departs {f.at}
                                    </dd>
                                  </div>
                                  <div className="pairs__pair">
                                    <dt>Travelling alone</dt>
                                    <dd>
                                      {f.unaccompanied ? (
                                        <span className="mark mark--overdue">
                                          Unaccompanied minor
                                        </span>
                                      ) : (
                                        'No — travelling as a normal passenger'
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                              )}
                              {f?.unaccompanied && (
                                <p className="meta" style={{ marginTop: 10 }}>
                                  The airline will not take an unaccompanied minor
                                  without the paperwork and a named adult handing
                                  them over at the desk. Whoever leads this run
                                  does that, and does not leave until the child is
                                  through.
                                </p>
                              )}
                            </section>

                            <section>
                              <p className="label">The vehicle</p>
                              {!run || !charge ? (
                                <p className="mark mark--critical">
                                  No seat on any run for this day. Nothing will
                                  collect them.
                                </p>
                              ) : (
                                <>
                                  <dl className="pairs">
                                    <div className="pairs__pair">
                                      <dt>Vehicle</dt>
                                      <dd>
                                        {run.vehicle} · {run.studentIds.length} on board
                                      </dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Supplier</dt>
                                      <dd>{charge.supplier.name}</dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Dispatch</dt>
                                      <dd className="num">
                                        {charge.supplier.dispatch} · out of hours{' '}
                                        {charge.supplier.outOfHours}
                                      </dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Driver</dt>
                                      <dd>
                                        {charge.driver.name} ·{' '}
                                        <span className="num">{charge.driver.phone}</span>
                                      </dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Registration</dt>
                                      <dd className="num">{charge.driver.reg}</dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Booking reference</dt>
                                      <dd className="num">{charge.reference}</dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Our account</dt>
                                      <dd className="num">{charge.supplier.account}</dd>
                                    </div>
                                    <div className="pairs__pair">
                                      <dt>Charged</dt>
                                      <dd className="num">
                                        {fmtMoney(charge.chargedPence)} ·{' '}
                                        {charge.receipt
                                          ? `receipt ${charge.receipt.filename}`
                                          : 'no receipt attached'}
                                      </dd>
                                    </div>
                                  </dl>

                                  <p className="label" style={{ marginTop: 14 }}>
                                    Staff on the run
                                  </p>
                                  <ul className="log">
                                    {run.staffIds.map((id) => (
                                      <li key={id}>
                                        <button
                                          className="namebtn"
                                          onClick={() => setOpenStaff(id)}
                                        >
                                          {named(id)}
                                        </button>
                                        {id === run.meeterId && (
                                          <span
                                            className="mark mark--clear"
                                            style={{ marginLeft: 8 }}
                                          >
                                            Hands them over
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </section>

                            <section>
                              <p className="label">Before they go</p>
                              <dl className="pairs">
                                <div className="pairs__pair">
                                  <dt>Room to clear</dt>
                                  <dd>{roomLabel(s.roomId)}, bed {s.bed}</dd>
                                </div>
                                <div className="pairs__pair">
                                  <dt>Balance</dt>
                                  <dd className="num">
                                    {due > 0 ? `${fmtMoney(due)} outstanding` : 'Paid in full'}
                                  </dd>
                                </div>
                                <div className="pairs__pair">
                                  <dt>Stay</dt>
                                  <dd className="num">
                                    {fmtDate(s.arrival)} – {fmtDate(s.leaving)}
                                  </dd>
                                </div>
                              </dl>

                              <p className="label" style={{ marginTop: 14 }}>
                                Who to ring
                              </p>
                              <p className="meta">
                                Parent: {s.guardian.name} ·{' '}
                                <span className="num">{s.guardian.phone}</span>
                                {s.guardian.language !== 'English' &&
                                  ` · speaks ${s.guardian.language}`}
                              </p>
                              <p className="meta">
                                {agent
                                  ? `Agent: ${agent.name}, ${agent.contact} · ${agent.phone} · out of hours ${agent.outOfHours}`
                                  : 'Booked direct — no agent to ring, call the parents.'}
                              </p>
                              <p className="meta" style={{ marginTop: 10 }}>
                                <button
                                  className="btn"
                                  onClick={() => setOpenStudent(s.id)}
                                >
                                  Open the whole record
                                </button>
                              </p>
                            </section>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <p className="meta slab__more">
          Times come from the same builder the transfers screen uses: the desk
          wants a group two and a half hours before the flight, and the road
          time is door to door with bags rather than the optimistic number a
          maps app gives one car at 3am.
        </p>
      )}
    </>
  );
}
