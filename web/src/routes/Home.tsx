/* ── Home ─────────────────────────────────────────────────────────────────
   The first screen used to be a poster: a large greeting, a row of shortcuts
   that repeated the menu, and half the width given to a chat box. None of it
   said what was happening in the centre this morning.

   So it is organised the way the day is: the figures that decide whether
   anything is wrong, then the hours ahead, then the queue, then the chat at
   the bottom where it can be reached rather than stared at. Every number is
   derived from the same records the sections read, and every tile goes to the
   screen that can act on it — a dashboard figure nobody can click is a poster
   with a number on it.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo } from 'react';
import type { Route } from '../App';
import { Chat } from '../components/Chat';
import { ReminderList } from '../components/ReminderList';
import { IconArrow } from '../lib/icons';
import { KADIA_SYSTEM, kadiaTools } from '../lib/kadiaAgent';
import { useStore } from '../lib/store';
import { buildRuns } from '../lib/transfers';
import { hasRun, registerFor } from '../data/attendance';
import { waitingOnThem, waitingOnUs } from '../data/portal';
import { airportBy } from '../data/travel';
import {
  DEMO_TODAY, SEASON_END, SEASON_START, activityById, fmtMoney, groupById,
  isOnSite, type Session,
} from '../data/seed';

const TODAY = `${DEMO_TODAY.getFullYear()}-${String(DEMO_TODAY.getMonth() + 1).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;
const NOW = DEMO_TODAY.getHours() * 60 + DEMO_TODAY.getMinutes();
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const season = () => {
  const f = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${f(SEASON_START)} – ${f(SEASON_END)} ${SEASON_END.getFullYear()}`;
};

const greeting = () => {
  const h = DEMO_TODAY.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/* One thing that happens today, whatever kind of thing it is. The day does
   not arrive sorted by section. */
interface Moment {
  at: string;
  title: string;
  detail: string;
  mark: { label: string; cls: string } | null;
  go: Route;
}

export function Home({
  operator,
  onGo,
}: {
  operator: string;
  onGo: (r: Route) => void;
}) {
  const {
    open, students, staff, sessions, bookings, incidents, payments, registers,
    requests, flights, duties,
  } = useStore();

  const tools = kadiaTools({
    students, staff, sessions, bookings, incidents, payments, duties,
  });
  const critical = open.filter((r) => r.severity === 'safeguarding');
  const onSite = students.filter((s) => isOnSite(s));

  const today = useMemo(
    () => sessions.filter((s) => s.day === TODAY && s.status !== 'cancelled'),
    [sessions],
  );

  /* Registers outstanding, on the same rule the attendance screen uses. */
  const missing = today.filter(
    (s) => hasRun(s) && !registerFor(registers, s.id)?.takenBy,
  );

  const travelling = useMemo(() => {
    const inbound = buildRuns(TODAY, 'in', students, staff, flights);
    const outbound = buildRuns(TODAY, 'out', students, staff, flights);
    return { inbound, outbound, moved: inbound.studentsMoved + outbound.studentsMoved };
  }, [students, staff, flights]);

  const unmatched = payments.filter((p) => !p.studentId);
  const openIncidents = incidents.filter((i) => i.status === 'open');

  /* The hours ahead, from every record that has a time on it today. */
  const moments = useMemo<Moment[]>(() => {
    const out: Moment[] = [];

    today.forEach((s: Session) => {
      const reg = registerFor(registers, s.id);
      out.push({
        at: s.start,
        title: `${activityById(s.activityId).name} · ${groupById(s.groupId).name}`,
        detail: `${s.start}–${s.end} · ${s.staffIds.length} staff`,
        mark: !hasRun(s)
          ? null
          : reg?.closedBy
            ? { label: 'Counted back', cls: 'mark--clear' }
            : reg?.takenBy
              ? { label: 'Open register', cls: 'mark--idle' }
              : { label: 'No register', cls: 'mark--critical' },
        go: 'attendance',
      });
    });

    [...travelling.inbound.runs, ...travelling.outbound.runs].forEach((r) => {
      out.push({
        at: r.leaveCentre,
        title: `${r.vehicle} to ${airportBy(r.airport).name}`,
        detail: `${r.studentIds.length} ${r.studentIds.length === 1 ? 'student' : 'students'} · ${
          r.direction === 'in'
            ? `meet ${r.meetFrom}`
            : `flights ${r.meetFrom}${r.meetTo === r.meetFrom ? '' : `–${r.meetTo}`}`
        }`,
        mark:
          r.unaccompanied > 0
            ? { label: `${r.unaccompanied} alone`, cls: 'mark--overdue' }
            : null,
        go: 'transfers',
      });
    });

    return out.sort((a, b) => mins(a.at) - mins(b.at));
  }, [today, registers, travelling]);

  const ahead = moments.filter((m) => mins(m.at) >= NOW);
  const behind = moments.length - ahead.length;

  /* Five groups leave at 09:00 and five registers are due at 09:00. Printed
     as ten rows with the same time on each, the clock stops carrying any
     information — so one time, and everything that happens at it under it. */
  const slots = useMemo(() => {
    const by = new Map<string, Moment[]>();
    ahead.forEach((m) => by.set(m.at, [...(by.get(m.at) ?? []), m]));
    return [...by.entries()];
  }, [ahead]);

  /* Six figures, each one somebody can act on, each linked to the screen that
     acts on it. */
  const figures: {
    n: string;
    label: string;
    note: string;
    go: Route;
    alarm?: boolean;
  }[] = [
    {
      n: String(onSite.length),
      label: 'students on site',
      note: `${students.length} on the books this season`,
      go: 'students',
    },
    {
      n: String(today.length),
      label: 'sessions today',
      note: missing.length
        ? `${missing.length} ran with no register`
        : 'every register taken so far',
      go: 'attendance',
      alarm: missing.length > 0,
    },
    {
      n: String(travelling.moved),
      label: 'travelling today',
      note: `${travelling.inbound.runs.length + travelling.outbound.runs.length} vehicle runs`,
      go: 'transfers',
    },
    {
      n: String(critical.length),
      label: 'safeguarding items',
      note: `of ${open.length} outstanding`,
      go: 'reminders',
      alarm: critical.length > 0,
    },
    {
      n: String(waitingOnThem(requests).length),
      label: 'documents chased',
      note: `${waitingOnUs(requests).length} waiting for verification`,
      go: 'portal',
    },
    {
      n: fmtMoney(unmatched.reduce((t, p) => t + p.amountPence, 0)),
      label: 'money unmatched',
      note: `${unmatched.length} payments with no student`,
      go: 'finance',
      alarm: unmatched.length > 0,
    },
  ];

  return (
    <main id="main" className="hero">
      <header className="lede">
        <div className="lede__row">
          <h1 className="lede__title">
            <span className="serif">{greeting()}</span>, {operator}.
          </h1>
          <p className="lede__when">
            {DEMO_TODAY.toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
            <span className="lede__season">{season()} · seeded demonstration data</span>
          </p>
        </div>

        <p className="lede__sub">
          {open.length === 0
            ? 'Nothing outstanding across the centre.'
            : critical.length > 0
              ? `${open.length} things need you. ${critical.length} are safeguarding, ${openIncidents.length} incidents are open, and ${ahead.length} things still happen today.`
              : `${open.length} things need you, none of them safeguarding. ${ahead.length} things still happen today.`}
        </p>

        <div className="lede__cta">
          <button className="btn btn--primary" onClick={() => onGo('reminders')}>
            Open reminders
            <IconArrow />
          </button>
          <button className="btn btn--butter" onClick={() => onGo('kadia')}>
            Ask Kadia
          </button>
        </div>
      </header>

      <div className="stage">
        <div className="figs">
          {figures.map((f) => (
            <button
              key={f.label}
              className={`fig${f.alarm ? ' fig--alarm' : ''}`}
              onClick={() => onGo(f.go)}
            >
              <span className="fig__n num">{f.n}</span>
              <span className="fig__label">{f.label}</span>
              <span className="fig__note meta">{f.note}</span>
            </button>
          ))}
        </div>

        <div className="hero__grid">
          <section className="slab" aria-labelledby="ahead-head">
            <div className="slab__head">
              <h2 id="ahead-head" className="slab__title">
                The rest of today
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('timetable')}>
                Timetable
                <IconArrow />
              </button>
            </div>

            {ahead.length === 0 ? (
              <p className="meta reminders__empty">
                Nothing else is timetabled today. {behind} things have already
                happened.
              </p>
            ) : (
              <>
                <ol className="tl">
                  {slots.slice(0, 4).map(([at, items]) => (
                    <li key={at} className="tl__slot">
                      <p className="tl__at num">{at}</p>
                      <ul className="tl__items">
                        {items.map((m, i) => (
                          <li key={`${at}-${i}`}>
                            <button className="tl__row" onClick={() => onGo(m.go)}>
                              <span className="tl__what">
                                <span className="tl__title">{m.title}</span>
                                <span className="meta">{m.detail}</span>
                              </span>
                              {m.mark && (
                                <span className={`mark ${m.mark.cls}`}>
                                  {m.mark.label}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <p className="meta slab__more">
                  {behind} earlier today
                  {slots.length > 4 &&
                    `, and ${slots.slice(4).reduce((n, [, xs]) => n + xs.length, 0)} more from ${slots[4][0]}`}
                  .
                </p>
              </>
            )}
          </section>

          <section className="slab" aria-labelledby="queue-head">
            <div className="slab__head">
              <h2 id="queue-head" className="slab__title">
                Needs you
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('reminders')}>
                All {open.length}
                <IconArrow />
              </button>
            </div>
            <ReminderList
              items={[...critical, ...open.filter((r) => r.severity !== 'safeguarding')].slice(0, 5)}
              onGo={onGo}
              compact
            />
            {open.length > 5 && (
              <p className="meta slab__more">
                {open.length - 5} more in Reminders, worst first.
              </p>
            )}
          </section>
        </div>

        <section className="slab slab--chat" aria-label="Ask Kadia">
          <div className="slab__head">
            <h2 className="slab__title">Ask Kadia</h2>
            <button className="btn btn--quiet" onClick={() => onGo('kadia')}>
              Open full screen
              <IconArrow />
            </button>
          </div>
          <Chat
            system={KADIA_SYSTEM}
            tools={tools}
            greeting="Ask anything about the centre — I read the real records."
            placeholder="e.g. Who is arriving Sunday without documents?"
            suggestions={[
              'What needs my attention today?',
              'Which staff cannot be rota’d, and why?',
              'Which registers are missing?',
            ]}
          />
        </section>
      </div>
    </main>
  );
}
