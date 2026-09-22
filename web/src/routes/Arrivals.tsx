import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { AskDock } from '../components/AskDock';
import { RunPlan } from '../components/RunPlan';
import { Chat } from '../components/Chat';
import { ReadinessMark } from '../components/StudentReadiness';
import { StudentProfile } from '../components/StudentProfile';
import { IconCheck } from '../lib/icons';
import { useStore } from '../lib/store';
import {
  changed, parseRoomingSpec, propose, roomReport, type Proposal,
} from '../lib/allocate';
import { KADIA_SYSTEM, kadiaTools } from '../lib/kadiaAgent';
import {
  ROOMS, STUDENTS, daysFromToday, fmtDate, groupByArrival, groupById, isOnSite,
  readiness, roomLabel, upcomingArrivals, whenLabel, type Student,
} from '../data/seed';
import { Lede } from '../components/Lede';

/* -1 is the rest of the season from today; -2 is the whole season, including
   the students who have already walked in. A centre plans the season it sold,
   not only the part of it that has not happened yet. */
type Window = 0 | 7 | -1 | -2;

export function Arrivals() {
  const {
    students, staff, sessions, bookings, incidents, payments, duties, rooming,
    applyAllocation, role,
  } = useStore();
  const [win, setWin] = useState<Window>(7);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [planned, setPlanned] = useState<string>('');
  const [ask, setAsk] = useState<{ text: string; nonce: number } | null>(null);
  /* One arrival day, or all of them. A centre works a changeover day at a
     time — "who is landing on the 19th" is the question, not "who is landing
     at some point in the next seven weeks". */
  const [day, setDay] = useState<string>('');
  /* Two readings of the same day: the children, and the vehicles that carry
     them. A centre plans both in one breath, so they are one screen. */
  const [how, setHow] = useState<'people' | 'vehicles'>('people');

  /* Live records for the planner and the chat, so a bed applied here is the
     bed every other screen reads. */
  const live = useRef({ students, rooming });
  live.current = { students, rooming };

  const upcoming = useMemo(() => upcomingArrivals(), [students]);
  const all = useMemo(
    () =>
      win === -2
        ? [...students].sort((a, b) => a.arrival.localeCompare(b.arrival))
        : upcoming,
    [students, upcoming, win],
  );

  /* Everything the window allows, before the day filter — that is what the
     day dropdown is built from, so it always offers days that exist. */
  const inWindow = all.filter(
    (s) => !(win >= 0 && daysFromToday(s.arrival) > win),
  );

  const dayOptions = useMemo(() => groupByArrival(inWindow), [inWindow]);

  const rows = inWindow.filter((s) => {
    if (day && s.arrival !== day) return false;
    if (!q) return true;
    return `${s.forename} ${s.surname} ${s.country} ${groupById(s.groupId).name} ${roomLabel(s.roomId)}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  /* A day chosen in one window may not exist in the next. Drop it rather than
     showing an empty screen with a filter nobody can see the effect of. */
  useEffect(() => {
    if (day && !dayOptions.some(([d]) => d === day)) setDay('');
  }, [day, dayOptions]);

  const days = groupByArrival(rows);
  const blocked = rows.filter((s) => !readiness(s).ready);

  /* Windows are always measured against what is still to come, whichever
     view is on screen. */
  const within = (n: number) =>
    upcoming.filter((s) => daysFromToday(s.arrival) <= n).length;

  const tabs: { id: Window; label: string }[] = [
    { id: 0, label: `Arriving today ${within(0)}` },
    { id: 7, label: `Next 7 days ${within(7)}` },
    { id: -1, label: `Still to come ${upcomingArrivals().length}` },
    { id: -2, label: `Whole season ${students.length}` },
  ];

  /* Beds. The residence cannot say yes to an arrival it has nowhere to put,
     so the planner lives on the arrivals screen as well as the rooms one —
     this is where somebody notices. */
  const noBed = rows.filter((s) => !s.roomId || !s.bed);

  function planGaps() {
    const p = propose(live.current.students, live.current.rooming, ROOMS, 'fill-gaps');
    setProposal(p);
    setPlanned(`every student with no bed — ${noBed.length} in this view`);
    return p;
  }

  /* Replanning one arrival day: release that day's beds and plan them back in
     around everybody else. Nobody already settled is moved, which is the whole
     difference between planning an arrival and reshuffling a centre. */
  function planDay(date: string) {
    const cohort = new Set(
      live.current.students.filter((s) => s.arrival === date).map((s) => s.id),
    );
    const freed: Student[] = live.current.students.map((s) =>
      cohort.has(s.id) ? { ...s, roomId: null, bed: 0 } : s,
    );
    const p = propose(freed, live.current.rooming, ROOMS, 'fill-gaps');
    setProposal(p);
    setPlanned(`everybody arriving ${fmtDate(date)} — ${cohort.size} students`);
    return p;
  }

  const realMoves = proposal ? changed(proposal, live.current.students) : [];

  /* Asked in words. The same planner, so the answer and the buttons cannot
     disagree, and it works with no API key. */
  function localBedCommand(query: string) {
    const t = query.toLowerCase();
    const subject = /\b(bed|beds|room|rooms|rooming|allocat|dorm|sleep)\b/.test(t);
    const verb = /\b(plan|allocat|sort|give|find|fill|work out|do|arrange|put)\b/.test(t);
    if (!subject || !verb) return null;

    /* "19 Jul", "19 July", "2027-07-19" and "Monday 19 July" all name the
       same arrival day, and a centre types whichever is in front of them. */
    const day = [...new Set(live.current.students.map((s) => s.arrival))].find((d) => {
      const long = new Date(d)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
        .toLowerCase();
      return t.includes(fmtDate(d).toLowerCase()) || t.includes(d) || t.includes(long);
    });
    const parsed = parseRoomingSpec(query, live.current.rooming, [
      ...new Set(ROOMS.map((r) => r.block)),
    ]);
    const p = day ? planDay(day) : planGaps();
    return {
      text: roomReport(p, changed(p, live.current.students), parsed),
      source: 'the bed planner',
    };
  }

  return (
    <>
      <AskDock
        title="Ask Kadia to plan the beds"
        hint="in words — it shows every move before anything is applied"
        chips={[
          'Give every student with no bed one',
          'Give everyone arriving 19 July a bed',
          'Plan the beds and never put two of the same language together',
        ]}
        onAsk={(text) => setAsk({ text, nonce: Date.now() })}
      >
      <Chat
        system={KADIA_SYSTEM}
        tools={kadiaTools({
          students, staff, sessions, bookings, incidents, payments, duties,
        })}
        greeting="Ask for beds in words — I plan them and show you what moves. Nothing is applied until you say so."
        placeholder="e.g. Give everyone arriving Sunday a bed, ages within a year"
        suggestions={[]}
        localCommands={localBedCommand}
        ask={ask}
      />
      </AskDock>

      <SectionHead
        title="New arrivals"
        count={
          day
            ? `${rows.length} arriving ${fmtDate(day)} · ${rows.filter((s) => !readiness(s).ready).length} not ready`
            : win === -2
              ? `${students.length} students across the whole season · ${upcoming.length} still to arrive`
              : `${upcoming.length} still to arrive this season`
        }
      >
        <select
          className="field"
          style={{ width: 230 }}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Filter by arrival day"
        >
          <option value="">
            Every arrival day · {inWindow.length} students
          </option>
          {dayOptions.map(([d, list]) => (
            <option key={d} value={d}>
              {new Date(d).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
              {' — '}
              {list.length} arriving
            </option>
          ))}
        </select>
        <input
          className="field"
          style={{ width: 200 }}
          placeholder="Search name, country, room"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search arrivals"
        />
      </SectionHead>

      <Lede>
        {win === -2
          ? 'Every student the season sold, by the day they land — the ones already here included, so the whole intake can be read in one list.'
          : 'Every student still to come, by the day they land.'}{' '}
        A student is <strong>not ready</strong> if they have no bed or a missing
        medical or consent form — both are safeguarding, and both have to clear
        before they walk in. Everything else is a watch, not a block.
      </Lede>

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

      <div className="tabs" role="tablist" aria-label="Arrivals view">
        {([
          { id: 'people', label: 'The children' },
          { id: 'vehicles', label: 'Getting them here' },
        ] as const).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={how === t.id}
            className={`tab${how === t.id ? ' tab--on' : ''}`}
            onClick={() => setHow(t.id)}
          >
            {t.label}
          </button>
        ))}
        {how === 'vehicles' && !day && dayOptions.length > 0 && (
          <span className="meta" style={{ alignSelf: 'center', marginLeft: 8 }}>
            showing {fmtDate(dayOptions[0][0])} — pick another above
          </span>
        )}
      </div>

      {how === 'vehicles' && (
        dayOptions.length === 0 ? (
          <p className="meta reminders__empty">
            Nobody arrives in this window, so there is nothing to meet.
          </p>
        ) : (
          <RunPlan day={day || dayOptions[0][0]} direction="in" />
        )
      )}

      {open && <StudentProfile id={open} onClose={() => setOpen(null)} />}

      {how === 'people' && (
      <div className="planner">
        <div className="planner__head">
          <p className="label">Beds for these arrivals</p>
          <p className="meta">
            {noBed.length === 0
              ? 'Everybody in this view has a bed. Replan an arrival day if the beds need to move.'
              : `${noBed.length} of ${rows.length} in this view have no bed. A student with nowhere to sleep cannot be admitted, so this is the one that has to clear before the day itself.`}
          </p>
        </div>

        <div className="planner__acts">
          <button className="btn btn--primary" onClick={() => planGaps()}>
            Give every student with no bed one
          </button>
          {days.length > 0 && (
            <select
              className="field"
              style={{ width: 240 }}
              value=""
              aria-label="Replan one arrival day"
              onChange={(e) => e.target.value && planDay(e.target.value)}
            >
              <option value="">Replan one arrival day…</option>
              {days.map(([date, list]) => (
                <option key={date} value={date}>
                  {fmtDate(date)} — {list.length} arriving
                </option>
              ))}
            </select>
          )}
          {proposal && (
            <button className="btn" onClick={() => setProposal(null)}>
              Discard the plan
            </button>
          )}
        </div>

        {proposal && (
          <div className="planner__out">
            <p className="meta">
              Planned for {planned}. {realMoves.length} students move,{' '}
              {proposal.unplaced.length} could not be placed. Nothing is applied
              until you say so.
            </p>

            {realMoves.length > 0 && (
              <ul className="log">
                {realMoves.slice(0, 8).map((m) => (
                  <li key={m.studentId}>
                    <strong>{m.name}</strong> → {roomLabel(m.toRoomId)}, bed {m.bed}
                    <span className="meta" style={{ display: 'block' }}>
                      {m.because.join(' · ')}
                    </span>
                  </li>
                ))}
                {realMoves.length > 8 && (
                  <li className="meta">…and {realMoves.length - 8} more</li>
                )}
              </ul>
            )}

            {proposal.unplaced.length > 0 && (
              <ul className="log">
                {proposal.unplaced.slice(0, 4).map((u) => (
                  <li key={u.studentId}>
                    <span className="mark mark--critical">No bed</span> {u.name} —{' '}
                    {u.why}
                  </li>
                ))}
              </ul>
            )}

            <div className="planner__acts">
              <button
                className="btn btn--primary"
                disabled={!role.canEditRecords || realMoves.length === 0}
                onClick={() => {
                  applyAllocation(proposal.moves);
                  setProposal(null);
                }}
              >
                <IconCheck />
                Apply {realMoves.length} changes
              </button>
              {!role.canEditRecords && (
                <span className="meta">
                  {role.name} can plan the beds but not apply them.
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      )}

      {how === 'people' && blocked.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 22 }}>
          {blocked.length} of {rows.length} arriving in this window cannot be
          admitted yet
        </p>
      )}

      {how === 'people' && (days.length === 0 ? (
        <p className="meta reminders__empty">
          No arrivals {day ? `on ${fmtDate(day)}` : 'in this window'}
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
                  {whenLabel(date)} · {list.length} arriving
                  {daysFromToday(date) < 0 && ' · already here'}
                  {list.filter((s) => !s.roomId || !s.bed).length > 0 &&
                    ` · ${list.filter((s) => !s.roomId || !s.bed).length} with no bed`}
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
                          <button className="namebtn" onClick={() => setOpen(s.id)}>
                            {s.forename} {s.surname}
                          </button>
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
      ))}
    </>
  );
}
