import { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { SectionHead } from '../components/SectionHead';
import { Chat } from '../components/Chat';
import { StaffProfile } from '../components/StaffProfile';
import { ActivityGuide } from '../components/ActivityGuide';
import { IconClose } from '../lib/icons';
import { checkRatio } from '../lib/ratio';
import { generate, parseSpec, report, type Spec } from '../lib/schedule';
import type { ToolSpec } from '../lib/anthropic';
import {
  ACTIVITIES, DEMO_TODAY, GROUPS, SESSIONS, SLOTS, STAFF, activityById,
  fmtDateLong, groupById, isAway, staffById, type Session,
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
  const { sessions: allSessions, updateSessions } = useStore();
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [guide, setGuide] = useState<string | null>(null);
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

  function localTimetableCommand(q: string) {
    const t = q.toLowerCase();
    const asking =
      /\b(generate|draft|redraft|rebuild|build|create|make|plan|schedule|redo|fill|sort out)\b/.test(
        t,
      );
    /* "Rebuild Kestrel from scratch" never says "timetable". A named group, or
       "from scratch", is the same instruction. */
    const aboutTheDay =
      /\b(timetable|day|rota|schedule|sessions?|slots?|from scratch)\b/.test(t) ||
      GROUPS.some((g) => t.includes(g.name.toLowerCase()));
    if (!asking || !aboutTheDay) return null;
    const parsed = parseSpec(q, TODAY_ISO);
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

      <div className="tt">
        <div className="tt__grid">
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
