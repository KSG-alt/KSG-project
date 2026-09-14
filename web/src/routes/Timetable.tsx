import { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { SectionHead } from '../components/SectionHead';
import { Chat } from '../components/Chat';
import { StaffProfile } from '../components/StaffProfile';
import { ActivityGuide } from '../components/ActivityGuide';
import { IconClose } from '../lib/icons';
import { checkRatio } from '../lib/ratio';
import {
  generate, generateWeek, parseSpec, report, weekReport, type HoursTarget,
  type Spec,
} from '../lib/schedule';
import { DUTY_PATTERNS, dutyHours, dutyWeek, isChangeover } from '../data/duty';
import type { ToolSpec } from '../lib/anthropic';
import {
  ACTIVITIES, DEMO_TODAY, GROUPS, SESSIONS, SLOTS, STAFF, WEEKLY_LIMIT,
  WEEK_DAYS, activityById, dayName, fmtDate, fmtDateLong, fmtHours, groupById,
  isAway, staffById, weeklyHours, type Session,
} from '../data/seed';

const TODAY_ISO = `${DEMO_TODAY.getFullYear()}-${String(
  DEMO_TODAY.getMonth() + 1,
).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;

const CANCEL_REASONS = [
  'Weather — unsafe',
  'Supplier cancelled',
  'Staff shortage',
  'Venue unavailable',
];

export function Timetable() {
  const { sessions: allSessions, updateSessions, duties, setDuties, staff } =
    useStore();
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [guide, setGuide] = useState<string | null>(null);
  const [view, setView] = useState<'day' | 'week' | 'duty' | 'hours'>('day');
  /* One day on screen; the rota underneath runs the whole week. */
  const sessions = useMemo(
    () => allSessions.filter((s) => s.day === TODAY_ISO),
    [allSessions],
  );
  const setSessions = updateSessions;
  const [selected, setSelected] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const live = useRef(sessions);
  live.current = allSessions;

  const drafted = sessions.filter((s) => s.origin === 'ai-draft').length;

  const breaches = useMemo(
    () =>
      sessions.filter(
        (s) => s.status !== 'cancelled' && !checkRatio(s).compliant,
      ),
    [sessions],
  );

  function note(line: string) {
    setLog((l) => [line, ...l].slice(0, 8));
  }

  /* Cancelling re-slots only the group that lost the session — never the
     whole timetable. (interface-contract.md §2) */
  function cancel(id: string, reason: string) {
    const target = live.current.find((s) => s.id === id);
    if (!target) return;
    const group = groupById(target.groupId);
    const laterFree = SLOTS.map((sl) => sl.start).filter(
      (start) =>
        start > target.start &&
        !live.current.some(
          (s) =>
            s.groupId === target.groupId &&
            s.start === start &&
            s.status !== 'cancelled',
        ),
    );

    setSessions((all) => {
      const next = all.map((s) =>
        s.id === id ? { ...s, status: 'cancelled' as const, reslotReason: reason } : s,
      );
      if (laterFree.length) {
        const slot = SLOTS.find((sl) => sl.start === laterFree[0])!;
        next.push({
          ...target,
          id: `${target.id}-r${next.length}`,
          start: slot.start,
          end: slot.end,
          status: 'reslotted',
          origin: 'manual',
          reslotFrom: target.start,
          reslotReason: reason,
        });
      }
      return next;
    });

    note(
      laterFree.length
        ? `${activityById(target.activityId).name} cancelled for ${group.name} — re-slotted to ${laterFree[0]}. No other group touched.`
        : `${activityById(target.activityId).name} cancelled for ${group.name} — no free slot left today, nothing re-slotted.`,
    );
    setApproved(false);
  }

  function move(id: string, start: string) {
    const slot = SLOTS.find((sl) => sl.start === start);
    if (!slot) return;
    setSessions((all) =>
      all.map((s) =>
        s.id === id ? { ...s, start: slot.start, end: slot.end, origin: 'manual' } : s,
      ),
    );
    setApproved(false);
  }

  function setStaff(id: string, staffIds: string[]) {
    setSessions((all) =>
      all.map((s) => (s.id === id ? { ...s, staffIds, origin: 'manual' } : s)),
    );
    setApproved(false);
  }

  const tools: ToolSpec[] = [
    {
      name: 'read_timetable',
      description:
        'Read every session on the current day, with group, activity, time, assigned staff, status and ratio verdict.',
      input_schema: { type: 'object', properties: {} },
      run: () =>
        live.current.map((s) => ({
          id: s.id,
          group: groupById(s.groupId).name,
          activity: activityById(s.activityId).name,
          start: s.start,
          end: s.end,
          status: s.status,
          origin: s.origin,
          staff: s.staffIds.map((i) => `${staffById(i).forename} ${staffById(i).surname}`),
          ratio: checkRatio(s),
        })),
    },
    {
      name: 'list_options',
      description: 'List the slots, groups, activities and staff available to schedule with.',
      input_schema: { type: 'object', properties: {} },
      run: () => ({
        slots: SLOTS,
        groups: GROUPS.map((g) => ({ name: g.name, band: g.band, ratio: g.ratio })),
        activities: ACTIVITIES.map((a) => ({
          name: a.name, location: a.location, capacity: a.capacity, requiresQual: a.requiresQual,
        })),
        staff: STAFF.map((s) => ({
          name: `${s.forename} ${s.surname}`, bands: s.bands, quals: s.quals, dbs: s.dbs.state,
        })),
      }),
    },
    {
      name: 'generate_timetable',
      description:
        "Draft the day from scratch against a set of specifications. Use this when asked to generate, rebuild or redraft the timetable rather than to edit one session. It only ever drafts — it never approves. It returns what it made and, importantly, everything it could not satisfy and why. Report the unmet list to the user rather than implying the day is finished.",
      input_schema: {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: { type: 'string' },
            description: 'Group names to redraft. Omit for every group.',
          },
          slots: {
            type: 'array',
            items: { type: 'string' },
            description: 'Slot start times to fill, e.g. ["09:00","11:00"]. Omit for all four.',
          },
          only_activities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Restrict the day to these activity names.',
          },
          avoid_activities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Activity names not to schedule, e.g. after a weather call.',
          },
          require_per_group: {
            type: 'array',
            items: { type: 'string' },
            description: 'Activity names every group must get once, if it fits.',
          },
          no_repeat_per_group: {
            type: 'boolean',
            description: 'Default true. A group does not do the same activity twice in a day.',
          },
          max_off_site_per_group: {
            type: 'number',
            description: 'Default 1. Set 0 to keep the whole day on site.',
          },
          keep_manual: {
            type: 'boolean',
            description: 'Default true. Sessions a person edited by hand are left alone.',
          },
        },
      },
      run: (i: {
        groups?: string[];
        slots?: string[];
        only_activities?: string[];
        avoid_activities?: string[];
        require_per_group?: string[];
        no_repeat_per_group?: boolean;
        max_off_site_per_group?: number;
        keep_manual?: boolean;
      }) => {
        const byName = (names?: string[]) =>
          names
            ?.map(
              (n) =>
                ACTIVITIES.find(
                  (a) => a.name.toLowerCase() === n.toLowerCase().trim(),
                )?.id,
            )
            .filter((x): x is string => Boolean(x));

        const spec: Spec = {
          day: TODAY_ISO,
          groupIds: i.groups
            ?.map(
              (n) =>
                GROUPS.find((g) => g.name.toLowerCase() === n.toLowerCase().trim())?.id,
            )
            .filter((x): x is string => Boolean(x)),
          slotStarts: i.slots,
          onlyActivities: byName(i.only_activities),
          avoidActivities: byName(i.avoid_activities),
          requirePerGroup: byName(i.require_per_group),
          noRepeatPerGroup: i.no_repeat_per_group ?? true,
          maxOffSitePerGroup: i.max_off_site_per_group ?? 1,
          keepManual: i.keep_manual ?? true,
        };
        const d = generate(spec, live.current);
        setSessions(() => d.sessions);
        setApproved(false);
        note(`Redrafted the day — ${d.made} made, ${d.replaced} replaced.`);
        return {
          made: d.made,
          replaced: d.replaced,
          kept_hand_edited: d.keptManual,
          untouched_outside_the_request: d.outOfScope,
          could_not_do: d.unmet,
          notes: d.notes,
          approved: false,
        };
      },
    },
    {
      name: 'move_session',
      description: 'Move one session to a different start time on the same day.',
      input_schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          start: { type: 'string', description: 'One of 09:00, 11:00, 14:00, 16:00' },
        },
        required: ['session_id', 'start'],
      },
      run: (i: { session_id: string; start: string }) => {
        move(i.session_id, i.start);
        note(`Moved ${i.session_id} to ${i.start}.`);
        return { ok: true };
      },
    },
    {
      name: 'cancel_session',
      description:
        'Cancel one session and re-slot that group only, if a later slot is free.',
      input_schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['session_id', 'reason'],
      },
      run: (i: { session_id: string; reason: string }) => {
        cancel(i.session_id, i.reason);
        return { ok: true };
      },
    },
    {
      name: 'assign_staff',
      description:
        'Set the staff assigned to a session. Pass full names exactly as list_options gives them.',
      input_schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          staff_names: { type: 'array', items: { type: 'string' } },
        },
        required: ['session_id', 'staff_names'],
      },
      run: (i: { session_id: string; staff_names: string[] }) => {
        const ids = i.staff_names
          .map(
            (n) =>
              STAFF.find(
                (s) => `${s.forename} ${s.surname}`.toLowerCase() === n.toLowerCase().trim(),
              )?.id,
          )
          .filter((x): x is string => Boolean(x));
        setStaff(i.session_id, ids);
        note(`Reassigned staff on ${i.session_id}.`);
        return { ok: true, matched: ids.length, of: i.staff_names.length };
      },
    },
  ];

  /* Drafting the day from a written instruction. The same builder serves the
     model's tool and the keyless path, so a demo without an API key can still
     generate a timetable rather than only describe one. */
  function draft(spec: Spec, parsed?: ReturnType<typeof parseSpec>) {
    const d = generate(spec, live.current);
    setSessions(() => d.sessions);
    setApproved(false);
    note(
      `Redrafted — ${d.made} sessions made, ${d.replaced} replaced, ` +
        `${d.unmet.length} left unresolved.`,
    );
    return report(d, parsed);
  }

  function draftWeek(spec: Omit<Spec, 'day'>, target: HoursTarget, parsed?: ReturnType<typeof parseSpec>) {
    const w = generateWeek(spec, live.current, duties, target);
    setSessions(() => w.sessions);
    setDuties(w.duties);
    setApproved(false);
    note(
      `Redrafted the whole week — ${w.activityHours.toFixed(0)}h of activity, ` +
        `${w.dutyHours.toFixed(0)}h of duty.`,
    );
    return weekReport(w, target, parsed);
  }

  function localTimetableCommand(q: string) {
    const t = q.toLowerCase();
    const asking =
      /\b(generate|draft|redraft|rebuild|build|create|make|plan|schedule|redo|fill|sort out)\b/.test(
        t,
      );
    /* "Rebuild Kestrel from scratch" never says "timetable". A named group, or
       "from scratch", is the same instruction. */
    const aboutTheDay =
      /\b(timetable|day|week|rota|schedule|sessions?|slots?|shifts?|duty|hours|contract|from scratch)\b/.test(
        t,
      ) ||
      GROUPS.some((g) => t.includes(g.name.toLowerCase()));
    if (!asking || !aboutTheDay) return null;
    const parsed = parseSpec(q, TODAY_ISO);

    /* "the week" is a different job from "the day": it schedules duty as well,
       and it is the only one that can answer a question about hours. */
    const wholeWeek = /\b(week|everyone|whole roster|all week|hours|40h|40 hours|contract)\b/.test(
      t,
    );
    if (wholeWeek) {
      const flat = /\b(40 ?h|40 hours|everyone (on|to) 40|same hours|level)\b/.test(t);
      const { day: _drop, ...rest } = parsed.spec;
      const text = draftWeek(
        rest,
        flat ? { mode: 'flat', flat: 40 } : { mode: 'contract' },
        parsed,
      );
      setView('hours');
      return { text, source: 'the rota builder' };
    }

    return { text: draft(parsed.spec, parsed), source: 'the rota builder' };
  }

  const sel = sessions.find((s) => s.id === selected) ?? null;
  const guideSession = sessions.find((s) => s.id === guide) ?? null;

  return (
    <>
      {openStaff && (
        <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />
      )}
      {guideSession && (
        <ActivityGuide session={guideSession} onClose={() => setGuide(null)} />
      )}

      <SectionHead title="Timetable" count={fmtDateLong(DEMO_TODAY.toISOString())}>
        <span className={`mark ${approved ? 'mark--clear' : 'mark--current'}`}>
          {approved ? 'Approved by Ismail' : `${drafted} sessions drafted, not approved`}
        </span>
        <button
          className="btn btn--primary"
          disabled={approved || breaches.length > 0}
          onClick={() => setApproved(true)}
          title={
            breaches.length > 0
              ? 'Clear the ratio breaches before approving.'
              : undefined
          }
        >
          Approve day
        </button>
      </SectionHead>

      {breaches.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 20 }}>
          {breaches.length} session{breaches.length > 1 ? 's' : ''} below required
          ratio or staffed by an uncleared DBS. A person decides this, not the
          draft.
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Rota view">
        {([
          { id: 'day', label: 'Today' },
          { id: 'week', label: 'The week' },
          { id: 'duty', label: `Duty ${duties.filter((d) => d.staffIds.length).length}/${duties.length}` },
          { id: 'hours', label: 'Hours' },
        ] as const).map((t) => (
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
      </div>

      <div className="tt">
        <div className="tt__grid" hidden={view !== 'day'}>
          <div className="tt__row tt__row--head">
            <div className="tt__cnr label">Group</div>
            {SLOTS.map((s) => (
              <div key={s.start} className="tt__slot label num">
                {s.start}–{s.end}
              </div>
            ))}
          </div>

          {GROUPS.map((g, gi) => (
            <div
              className="tt__row stagger"
              key={g.id}
              style={{ animationDelay: `${gi * 34}ms` }}
            >
              <div className="tt__group">
                <span style={{ fontWeight: 500 }}>{g.name}</span>
                <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                  {g.band} · 1:{g.ratio}
                </span>
              </div>

              {SLOTS.map((slot) => {
                const cell = sessions.filter(
                  (s) => s.groupId === g.id && s.start === slot.start,
                );
                if (!cell.length) {
                  return <div key={slot.start} className="tt__cell tt__cell--free">Free</div>;
                }
                return (
                  <div key={slot.start} className="tt__cell">
                    {cell.map((s) => {
                      const a = activityById(s.activityId);
                      const v = checkRatio(s);
                      const dead = s.status === 'cancelled';
                      /* Who is actually on it. The rota is only useful to the
                         person reading it if it names them. */
                      const crew = s.staffIds
                        .map((id) => STAFF.find((x) => x.id === id))
                        .filter((x): x is (typeof STAFF)[number] => Boolean(x));
                      return (
                        <div
                          key={s.id}
                          className={`sess${dead ? ' sess--dead' : ''}${
                            selected === s.id ? ' sess--on' : ''
                          }`}
                        >
                          <button
                            className="sess__open"
                            onClick={() => setGuide(s.id)}
                            title={`Open the ${a.name} guide`}
                          >
                            <span className="sess__name">{a.name}</span>
                            <span className="sess__where meta">{a.location}</span>
                            {dead ? (
                              <span className="mark mark--idle">Cancelled</span>
                            ) : (
                              <span
                                className={`mark ${v.compliant ? 'mark--clear' : 'mark--critical'}`}
                              >
                                {v.assigned}/{v.required} staff
                              </span>
                            )}
                            {!dead && (
                              <span className="sess__crew">
                                {crew.length === 0 ? (
                                  <span className="meta sess__nobody">
                                    Nobody assigned
                                  </span>
                                ) : (
                                  crew.map((c) => {
                                    const bad =
                                      c.dbs.state !== 'cleared' || isAway(c, s.day);
                                    return (
                                      <span
                                        key={c.id}
                                        className={`sess__who${bad ? ' sess__who--bad' : ''}`}
                                      >
                                        {c.forename} {c.surname[0]}
                                        {a.requiresQual &&
                                        c.quals.includes(a.requiresQual)
                                          ? ' ·'
                                          : ''}
                                      </span>
                                    );
                                  })
                                )}
                              </span>
                            )}
                            {s.status === 'reslotted' && (
                              <span className="meta num" style={{ color: 'var(--info)' }}>
                                Re-slotted from {s.reslotFrom}
                              </span>
                            )}
                          </button>

                          <button
                            className="sess__edit"
                            onClick={() =>
                              setSelected(selected === s.id ? null : s.id)
                            }
                            aria-pressed={selected === s.id}
                            title="Change the slot or the staffing"
                          >
                            edit
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {view === 'week' && (
          <div className="wk">
            {GROUPS.map((g) => (
              <section key={g.id} className="wk__group">
                <div className="wk__head">
                  <h3 className="wk__name">{g.name}</h3>
                  <span className="meta">
                    {g.band} · 1:{g.ratio} ·{' '}
                    {allSessions.filter((x) => x.groupId === g.id && WEEK_DAYS.includes(x.day) && x.status !== 'cancelled').length}{' '}
                    sessions
                  </span>
                </div>
                <div className="tablewrap">
                  <table className="reg wk__grid">
                    <thead>
                      <tr>
                        <th style={{ width: 74 }}>Day</th>
                        {SLOTS.map((sl) => (
                          <th key={sl.start} className="num">{sl.start}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_DAYS.map((d) => (
                        <tr key={d}>
                          <th scope="row" className="wk__day">
                            {dayName(d)}
                            <span className="meta num">{fmtDate(d)}</span>
                          </th>
                          {SLOTS.map((sl) => {
                            const x = allSessions.find(
                              (y) =>
                                y.groupId === g.id &&
                                y.day === d &&
                                y.start === sl.start &&
                                y.status !== 'cancelled',
                            );
                            if (!x) return <td key={sl.start} className="wk__free">—</td>;
                            const ok = checkRatio(x).compliant;
                            return (
                              <td key={sl.start}>
                                <button
                                  className={`wk__cell${ok ? '' : ' wk__cell--bad'}`}
                                  onClick={() => setGuide(x.id)}
                                >
                                  {activityById(x.activityId).name}
                                  <span className="meta">
                                    {x.staffIds.length} staff
                                  </span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        {view === 'duty' && (
          <div className="duty">
            <p className="meta section__lede">
              Activity sessions come to {(allSessions.filter((x) => WEEK_DAYS.includes(x.day) && x.status !== 'cancelled').length * 1.5).toFixed(0)}h
              across the week. A seasonal contract is 25 to 40 hours, so most of
              it is duty — meals, free time, the evening programme, nights, and
              changeover-day transfers. The rota has to schedule it, or it lands
              in a WhatsApp message on Sunday night.
            </p>
            {dutyWeek().map((d) => (
              <section key={d} className="duty__day">
                <div className="duty__head">
                  <h3 className="duty__date">
                    {dayName(d)} {fmtDate(d)}
                  </h3>
                  <span className="meta">
                    {isChangeover(d) ? 'Changeover — arrivals and departures' : 'Activity day'}
                  </span>
                </div>
                <div className="tablewrap">
                  <table className="reg">
                    <thead>
                      <tr>
                        <th style={{ width: '16%' }}>Shift</th>
                        <th style={{ width: 110 }}>Time</th>
                        <th style={{ width: 70 }}>Hours</th>
                        <th style={{ width: 90 }}>On it</th>
                        <th>Who</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duties
                        .filter((x) => x.day === d)
                        .map((x) => {
                          const pattern = DUTY_PATTERNS.find((pp) => pp.kind === x.kind);
                          const full = x.staffIds.length >= x.needed;
                          return (
                            <tr key={x.id}>
                              <td>
                                <span style={{ fontWeight: 500 }}>{x.kind}</span>
                                <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                                  {pattern?.what}
                                </span>
                              </td>
                              <td className="num">{x.start}–{x.end}</td>
                              <td className="num">{x.hours}h</td>
                              <td>
                                <span className={`mark ${full ? 'mark--clear' : 'mark--critical'}`}>
                                  {x.staffIds.length}/{x.needed}
                                </span>
                              </td>
                              <td className="meta">
                                {x.staffIds.length === 0
                                  ? 'Nobody rota\u2019d'
                                  : x.staffIds
                                      .map((id) => {
                                        const p2 = staff.find((y) => y.id === id);
                                        return p2 ? `${p2.forename} ${p2.surname[0]}` : '';
                                      })
                                      .join(', ')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        {view === 'hours' && (() => {
          const rows = staff
            .map((p2) => {
              const act = weeklyHours(p2.id, allSessions);
              const dut = dutyHours(p2.id, duties);
              return { p: p2, act, dut, total: act + dut };
            })
            .sort((x, y) => x.total - y.total);
          const rostered = rows.filter((r) => r.total > 0);
          const blocked = rows.filter((r) => r.p.dbs.state !== 'cleared');
          const short = rows.filter(
            (r) => r.p.dbs.state === 'cleared' && r.total < r.p.contractedHours - 2,
          );
          const over = rows.filter((r) => r.total > WEEKLY_LIMIT);
          const totalAll = rows.reduce((n, r) => n + r.total, 0);
          return (
            <div className="hours">
              <p className="meta section__lede">
                Rota&rsquo;d hours against each person&rsquo;s own contract, not
                against a flat number — the roster runs from 25 to 40 hours and
                working a 25-hour contract to 40 is not a full week, it is a
                breach. These are hours the rota schedules, never pay.
              </p>

              <div className="split">
                <span>
                  <span className="split__n num">{totalAll.toFixed(0)}h</span>
                  <span className="meta">rota&rsquo;d across {rostered.length} staff</span>
                </span>
                <span>
                  <span className="split__n num">
                    {rostered.length ? (totalAll / rostered.length).toFixed(1) : '0'}h
                  </span>
                  <span className="meta">each, on average</span>
                </span>
                <span>
                  <span className={`split__n num${short.length ? ' split__n--bad' : ''}`}>
                    {short.length}
                  </span>
                  <span className="meta">cleared, but more than 2h under contract</span>
                </span>
                <span>
                  <span className={`split__n num${blocked.length ? ' split__n--bad' : ''}`}>
                    {blocked.length}
                  </span>
                  <span className="meta">off everything — DBS not cleared</span>
                </span>
                <span>
                  <span className={`split__n num${over.length ? ' split__n--bad' : ''}`}>
                    {over.length}
                  </span>
                  <span className="meta">past the {WEEKLY_LIMIT}h limit</span>
                </span>
              </div>

              <div className="tablewrap">
                <table className="reg">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Name</th>
                      <th style={{ width: '15%' }}>Role</th>
                      <th>Activity</th>
                      <th>Duty</th>
                      <th>Total</th>
                      <th>Contract</th>
                      <th style={{ width: '24%' }}>Against contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const gap = r.total - r.p.contractedHours;
                      const pct = Math.min(
                        100,
                        (r.total / Math.max(r.p.contractedHours, 1)) * 100,
                      );
                      return (
                        <tr key={r.p.id}>
                          <td>
                            <button className="namebtn" onClick={() => setOpenStaff(r.p.id)}>
                              {r.p.forename} {r.p.surname}
                            </button>
                          </td>
                          <td className="meta">{r.p.role}</td>
                          <td className="num">{fmtHours(r.act)}</td>
                          <td className="num">{fmtHours(r.dut)}</td>
                          <td className="num" style={{ fontWeight: 500 }}>
                            {fmtHours(r.total)}
                          </td>
                          <td className="num meta">{fmtHours(r.p.contractedHours)}</td>
                          <td>
                            <span className="meter">
                              <span
                                className={`meter__fill${
                                  r.total > WEEKLY_LIMIT
                                    ? ' meter__fill--over'
                                    : gap < -2
                                    ? ' meter__fill--short'
                                    : ''
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                              {r.p.dbs.state !== 'cleared'
                                ? `DBS ${r.p.dbs.state} — cannot be rota’d`
                                : gap >= -2 && gap <= 2
                                ? 'on contract'
                                : gap < 0
                                ? `${fmtHours(-gap)} short`
                                : `${fmtHours(gap)} over`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <aside className="tt__side">
          {sel ? (
            <div className="panel">
              <div className="panel__head">
                <span className="label">Edit session</span>
                <button className="btn btn--quiet" onClick={() => setSelected(null)}>
                  <IconClose />
                </button>
              </div>

              <h2 style={{ fontSize: 'var(--t-md)', marginBottom: 4 }}>
                {activityById(sel.activityId).name}
              </h2>
              <p className="meta" style={{ margin: '0 0 16px', color: 'var(--ink-3)' }}>
                {groupById(sel.groupId).name} · {activityById(sel.activityId).location}
                {sel.origin === 'ai-draft' ? ' · drafted' : ' · edited by hand'}
              </p>

              <label className="editor__f" style={{ marginBottom: 14 }}>
                <span className="label">Slot</span>
                <select
                  className="field"
                  value={sel.start}
                  disabled={sel.status === 'cancelled'}
                  onChange={(e) => move(sel.id, e.target.value)}
                >
                  {SLOTS.map((s) => (
                    <option key={s.start} value={s.start}>
                      {s.start}–{s.end}
                    </option>
                  ))}
                </select>
              </label>

              {(() => {
                const v = checkRatio(sel);
                return v.compliant ? (
                  <p className="mark mark--clear">
                    Compliant — {v.assigned} of {v.required} for {v.headcount} at 1:
                    {v.ratio}
                  </p>
                ) : (
                  <div>
                    {v.reasons.map((r) => (
                      <p key={r} className="mark mark--critical" style={{ marginBottom: 6 }}>
                        {r}
                      </p>
                    ))}
                  </div>
                );
              })()}

              <p className="meta" style={{ color: 'var(--ink-3)', marginTop: 4 }}>
                Ratio verdict comes from the rota engine, not from this screen.
              </p>

              <div className="editor__f" style={{ marginBottom: 14 }}>
                <span className="label">
                  Staff assigned · {sel.staffIds.length} of {checkRatio(sel).required}
                </span>
                <div className="checklist">
                {STAFF.filter((s) => s.bands.includes(groupById(sel.groupId).band)).map(
                  (s) => {
                    const on = sel.staffIds.includes(s.id);
                    const cleared = s.dbs.state === 'cleared';
                    return (
                      <label key={s.id} className="check">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={sel.status === 'cancelled'}
                          onChange={() =>
                            setStaff(
                              sel.id,
                              on
                                ? sel.staffIds.filter((x) => x !== s.id)
                                : [...sel.staffIds, s.id],
                            )
                          }
                        />
                        <span>
                          {s.forename} {s.surname}
                        </span>
                        <button
                          type="button"
                          className="btn btn--quiet check__open"
                          onClick={(e) => {
                            e.preventDefault();
                            setOpenStaff(s.id);
                          }}
                          aria-label={`Open ${s.forename} ${s.surname}'s record`}
                        >
                          open
                        </button>
                        {!cleared && (
                          <span className="mark mark--critical">DBS {s.dbs.state}</span>
                        )}
                        {isAway(s, sel.day) && (
                          <span className="mark mark--critical">away this day</span>
                        )}
                      </label>
                    );
                  },
                )}
                </div>
              </div>

              {sel.status !== 'cancelled' && (
                <div style={{ marginTop: 18 }}>
                  <span className="label" style={{ display: 'block', marginBottom: 8 }}>
                    Cancel and re-slot this group
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CANCEL_REASONS.map((r) => (
                      <button key={r} className="btn" onClick={() => cancel(sel.id, r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel">
              <span className="label">Shape the day by chat</span>
              <p className="meta" style={{ margin: '10px 0 0', color: 'var(--ink-3)' }}>
                Pick a session on the grid to edit it by hand, or tell Kadia what
                the day should look like. It reads the real timetable and writes
                real changes — a person still approves the day.
              </p>
            </div>
          )}

          <Chat
            system={`You shape a summer-school day timetable for a UK activity centre. Today is ${fmtDateLong(
              DEMO_TODAY.toISOString(),
            )}.

Always call read_timetable before you change anything, and call list_options when you need valid slots, staff or activities. Use session ids exactly as read_timetable gives them.

To build a whole day, call generate_timetable with the specifications the user gave — which groups, which slots, what to avoid, what every group must get, how much can be off site. It returns a could_not_do list: always report that list. A day with unmet constraints is not a finished day, and saying so is the point.

Rules you must respect:
- Never assign a staff member whose DBS is not "cleared".
- An activity with a requiresQual needs a staff member holding that qualification.
- Never assign somebody who is away that day, and never book one person into two groups in the same slot.
- Cancelling re-slots that one group only. Never move other groups.
- You draft; a human approves. Say plainly what you changed and what still needs a person's decision.
Keep replies to a few short sentences. Use British English.`}
            tools={tools}
            greeting="Ask me to draft the day, with whatever the centre needs — no kayaking, English for every group, nothing off site. I build it and tell you what I could not do."
            placeholder="e.g. Redraft the day, no kayaking, English for every group"
            suggestions={[
              'Generate the timetable with no off-site sessions',
              'Redraft the day — no kayaking, and English for every group',
              'Rebuild Kestrel’s day, mornings only',
              'Which sessions are below ratio, and who could cover?',
            ]}
            localCommands={localTimetableCommand}
          />

          {log.length > 0 && (
            <div className="panel">
              <span className="label">Changes this session</span>
              <ul className="log">
                {log.map((l, i) => (
                  <li key={i} className="meta">{l}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
