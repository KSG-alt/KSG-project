import { useMemo, useRef, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReadinessMark } from '../components/StudentReadiness';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import {
  ROOMS, fmtDate, groupById, roomLabel, upcomingArrivals, wardenFor,
  whenLabel, DEMO_TODAY, fmtDateLong, type AgeBand, type Student,
} from '../data/seed';
import {
  changed, parseRoomingSpec, propose, roomReport, type Mode, type Proposal,
} from '../lib/allocate';
import { AskDock } from '../components/AskDock';
import { Chat } from '../components/Chat';
import type { ToolSpec } from '../lib/anthropic';
import { Lede } from '../components/Lede';

type View = 'rooms' | 'students' | 'unallocated' | 'arrivals' | 'plan';

export function Rooms() {
  const { students, rooming, applyAllocation, role } = useStore();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<Mode>('fill-gaps');
  /* The chat and the buttons drive the same planner, so a plan asked for in
     words and a plan asked for with a button are the same object. */
  const live = useRef({ students: [] as Student[], rooming });
  live.current = { students, rooming };

  /* Occupancy comes from the store, not the seed — the allocator changes it. */
  const STUDENTS = students;
  const occupants = (roomId: string) =>
    students.filter((s) => s.roomId === roomId).sort((a, b) => a.bed - b.bed);
  const [view, setView] = useState<View>('rooms');
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [ask, setAsk] = useState<{ text: string; nonce: number } | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [openRoom, setOpenRoom] = useState<string | null>(null);

  const unallocated = useMemo(
    () => students.filter((s) => !s.roomId),
    [students],
  );

  /* The arrivals the residence has to have beds ready for. */
  const incoming = useMemo(() => upcomingArrivals(), []);

  const used = ROOMS.filter((r) => occupants(r.id).length > 0);
  const beds = ROOMS.reduce((n, r) => n + r.beds, 0);
  const filled = STUDENTS.filter((s) => s.roomId).length;

  const matches = (s: (typeof STUDENTS)[number]) =>
    !q ||
    `${s.forename} ${s.surname} ${roomLabel(s.roomId)} ${groupById(s.groupId).name} ${s.country} ${s.guardian.name}`
      .toLowerCase()
      .includes(q.toLowerCase());

  const roomRows = used.filter(
    (r) =>
      !q ||
      `${r.block} ${r.number}`.toLowerCase().includes(q.toLowerCase()) ||
      occupants(r.id).some(matches),
  );

  const studentRows = STUDENTS.filter(matches);


  const BLOCKS = Array.from(new Set(ROOMS.map((r) => r.block)));

  /* One planner, three callers: the buttons, the keyless parser, and the
     model's tool. They all land here so a plan is a plan however it was
     asked for. */
  function plan(
    nextMode: Mode,
    rules = live.current.rooming,
    scope?: { bands?: AgeBand[]; blocks?: string[] },
  ) {
    const p = propose(live.current.students, rules, ROOMS, nextMode, scope);
    setMode(nextMode);
    setProposal(p);
    /* A plan asked for from the room list is still a plan: show it where it
       can be read and applied rather than leaving it behind a tab. */
    setView('plan');
    return p;
  }

  function localRoomCommand(q: string) {
    const t = q.toLowerCase();
    /* Either an explicit phrase for one of the two jobs, or a subject the
       planner owns paired with a verb that means do it. */
    const explicit = /\bfill the gaps?\b|\bfrom scratch\b|\breplan\b|\breshuffle\b/.test(t);
    const subject = /\b(room|rooms|rooming|bed|beds|allocat|dorm|sleep|gaps?|unallocated)\b/.test(t);
    const verb = /\b(plan|allocat|sort|fill|work out|do|redo|draft|arrange|put)\b/.test(t);
    if (!explicit && !(subject && verb)) return null;

    const parsed = parseRoomingSpec(q, live.current.rooming, BLOCKS);
    const p = plan(parsed.mode, parsed.rules, parsed.scope);
    const real = changed(p, live.current.students);
    return { text: roomReport(p, real, parsed), source: 'the bed planner' };
  }

  const tools: ToolSpec[] = [
    {
      name: 'rooming_state',
      description:
        'How the beds stand right now: rooms, capacity, who has no bed, and how many rooms share a first language.',
      input_schema: { type: 'object', properties: {} },
      run: () => {
        const ss = live.current.students;
        const byRoom = new Map<string, typeof ss>();
        ss.forEach((x) => {
          if (!x.roomId) return;
          byRoom.set(x.roomId, [...(byRoom.get(x.roomId) ?? []), x]);
        });
        let clashes = 0;
        byRoom.forEach((list) => {
          list.forEach((a, i) =>
            list.slice(i + 1).forEach((b) => {
              if (
                a.arrival <= b.leaving &&
                b.arrival <= a.leaving &&
                a.guardian.language === b.guardian.language
              ) {
                clashes += 1;
              }
            }),
          );
        });
        return {
          students: ss.length,
          with_a_bed: ss.filter((x) => x.roomId).length,
          without_a_bed: ss.filter((x) => !x.roomId).length,
          rooms: ROOMS.length,
          beds: ROOMS.reduce((n, r) => n + r.beds, 0),
          rooms_sharing_a_first_language: clashes,
          rules_in_force: live.current.rooming,
          blocks: BLOCKS,
          bands: ['8–11', '12–14', '15–17'],
        };
      },
    },
    {
      name: 'plan_beds',
      description:
        "Draft a bed plan. mode 'fill-gaps' places only students with no bed and never moves a settled one; 'from-scratch' replans and will move people who have unpacked. Returns what would change and everything it could not do. It does NOT apply anything.",
      input_schema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['fill-gaps', 'from-scratch'] },
          same_language_rule: {
            type: 'string',
            enum: ['avoid', 'never', 'allow'],
            description: 'Whether two speakers of one first language may share a room.',
          },
          max_age_spread: { type: 'number', description: 'Years, 1 to 5.' },
          reuse_beds: {
            type: 'boolean',
            description: 'Let a bed take a second student once the first has left.',
          },
          bands: { type: 'array', items: { type: 'string' }, description: 'e.g. ["8–11"]' },
          blocks: { type: 'array', items: { type: 'string' }, description: 'House names.' },
        },
      },
      run: (i: {
        mode?: Mode;
        same_language_rule?: 'avoid' | 'never' | 'allow';
        max_age_spread?: number;
        reuse_beds?: boolean;
        bands?: string[];
        blocks?: string[];
      }) => {
        const rules = {
          ...live.current.rooming,
          ...(i.same_language_rule
            ? {
                sameLanguageTogether: i.same_language_rule === 'allow',
                languageRule: i.same_language_rule === 'never' ? ('never' as const) : ('avoid' as const),
              }
            : {}),
          ...(i.max_age_spread ? { maxAgeSpread: i.max_age_spread } : {}),
          ...(i.reuse_beds !== undefined ? { reuseBeds: i.reuse_beds } : {}),
        };
        const scope =
          i.bands?.length || i.blocks?.length
            ? { bands: i.bands as AgeBand[] | undefined, blocks: i.blocks }
            : undefined;
        const p = plan(i.mode ?? 'fill-gaps', rules, scope);
        const real = changed(p, live.current.students);
        return {
          planned: p.moves.length,
          would_change_bed: real.length,
          already_settled_and_moved: real.filter((m) => m.fromRoomId).length,
          beds_reused_between_stays: p.sharedBeds,
          rooms_sharing_a_first_language: p.languagePairs,
          could_not_place: p.unplaced,
          sample: real.slice(0, 8).map((m) => ({
            student: m.name,
            to: roomLabel(m.toRoomId),
            bed: m.bed,
            because: m.because,
          })),
          applied: false,
        };
      },
    },
    {
      name: 'apply_plan',
      description:
        'Apply the plan currently on screen to every student record. Only call this when the user has clearly asked for it — never off your own judgement, and never without telling them how many students move.',
      input_schema: { type: 'object', properties: {} },
      run: () => {
        if (!proposal) return { applied: false, why: 'No plan has been drafted yet.' };
        const real = changed(proposal, live.current.students);
        if (!real.length) return { applied: false, why: 'Nothing would change.' };
        applyAllocation(proposal.moves);
        setProposal(null);
        return { applied: true, changed: real.length };
      },
    },
    {
      name: 'who_shares_with',
      description: 'Who a named student shares a room with, and what languages are in that room.',
      input_schema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      run: (i: { name: string }) => {
        const s = live.current.students.find((x) =>
          `${x.forename} ${x.surname}`.toLowerCase().includes(i.name.toLowerCase().trim()),
        );
        if (!s) return { found: false };
        if (!s.roomId) return { found: true, room: null, note: 'No bed allocated.' };
        const mates = live.current.students.filter(
          (x) => x.roomId === s.roomId && x.id !== s.id,
        );
        return {
          found: true,
          student: `${s.forename} ${s.surname}`,
          language: s.guardian.language,
          room: roomLabel(s.roomId),
          bed: s.bed,
          sharing_with: mates.map((m) => ({
            name: `${m.forename} ${m.surname}`,
            language: m.guardian.language,
            stay: `${m.arrival} to ${m.leaving}`,
            overlaps: m.arrival <= s.leaving && s.arrival <= m.leaving,
          })),
        };
      },
    },
  ];

  const tabs: { id: View; label: string }[] = [
    { id: 'rooms', label: `By room ${used.length}` },
    { id: 'students', label: `By student ${STUDENTS.length}` },
    { id: 'arrivals', label: `Still to arrive ${incoming.length}` },
    { id: 'unallocated', label: `Unallocated ${unallocated.length}` },
    { id: 'plan', label: 'Plan the beds' },
  ];

  return (
    <>
      <AskDock
              title="Ask Kadia to plan the beds"
              hint="it drafts; you apply. Nobody is moved without you"
              chips={[
                'Just fill the gaps, leave everyone else alone',
                'Plan the beds and never put two of the same language together',
                'Replan the 8–11 band from scratch, ages within 1 year',
              ]}
              onAsk={(text) => setAsk({ text, nonce: Date.now() })}
            >
              <Chat
                system={`You plan bed allocations for a residential summer school. Today is ${fmtDateLong(
                  DEMO_TODAY.toISOString(),
                )}.

Call rooming_state before you answer anything about how the beds stand. Call plan_beds to draft an allocation — it returns what would change and what it could not do, and it applies nothing.

Rules you must respect:
- A room holds one age band.
- A language school separates first languages on purpose. Two speakers of one language in a room is a bad outcome, not a neutral one.
- 'fill-gaps' is the safe default: it places students with no bed and moves nobody who has one. Only use 'from-scratch' when the user has asked to replan, and say plainly how many settled students it would move.
- Rooming by gender is NOT configured and you must not invent a policy for it. If asked, say it is specified by the centre in October and the planner does not consider it.
- You draft; a person applies. Never call apply_plan unless the user has clearly asked you to apply it, and always say how many students move.
Keep replies to a few short sentences. Use British English.`}
                tools={tools}
                greeting="Tell me how the rooms should work — mix the languages, keep ages close, just fill the gaps. I draft it and tell you what I could not do."
                placeholder="e.g. Plan the beds, never two of the same language"
                suggestions={[]}
                localCommands={localRoomCommand}
                ask={ask}
              />
            </AskDock>

      <SectionHead
        title="Room allocations"
        count={`${filled} of ${beds} beds · ${used.length} rooms in use across 3 houses`}
      >
        <input
          className="field"
          style={{ width: 230 }}
          placeholder="Search name, room, guardian"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search room allocations"
        />
      </SectionHead>

      <Lede>
        Rooms are allocated inside one age band. Whether a centre also rooms by
        gender is a per-centre configuration, specified in October, so it is not
        modelled here rather than guessed. Open any student for their full record
        and their parent or guardian&rsquo;s contact details.
      </Lede>

      <div className="tabs" role="tablist" aria-label="Allocation view">
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
      </div>

            {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}
      {openStaff && (
        <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />
      )}

      {view === 'plan' && (() => {
        const real = proposal ? changed(proposal, students) : [];
        const disrupted = real.filter((m) => m.fromRoomId);
        const rulesLine = [
          rooming.sameLanguageTogether
            ? 'same first language may share'
            : `same first language: ${rooming.languageRule}`,
          `age spread ${rooming.maxAgeSpread}y`,
          rooming.reuseBeds ? 'beds reused between stays' : 'one student per bed all season',
        ].join(' · ');

        return (
          <div className="beds">
            <div className="plan2">
            <Lede>
              The allocator fills every bed against the centre&rsquo;s rooming
              rules and shows what it would change before anything moves. It
              proposes; you apply it. Rules are set in Centre setup — right now:{' '}
              <strong>{rulesLine}</strong>.
            </Lede>

            <div className="split">
              <span>
                <span className="split__n num">{students.filter((x) => x.roomId).length}</span>
                <span className="meta">have a bed now</span>
              </span>
              <span>
                <span className={`split__n num${unallocated.length ? ' split__n--bad' : ''}`}>
                  {unallocated.length}
                </span>
                <span className="meta">have none</span>
              </span>
              <span>
                <span className="split__n num">{beds}</span>
                <span className="meta">beds across {ROOMS.length} rooms</span>
              </span>
            </div>

            <div className="editor__actions" style={{ marginTop: 4 }}>
              <button className="btn btn--primary" onClick={() => plan('fill-gaps')}>
                Fill the gaps
              </button>
              <button className="btn" onClick={() => plan('from-scratch')}>
                Plan from scratch
              </button>
              {proposal && (
                <button className="btn btn--quiet" onClick={() => setProposal(null)}>
                  Discard
                </button>
              )}
              <span className="meta">
                Filling the gaps leaves everyone who already has a bed exactly
                where they are. Planning from scratch is for before a season
                starts — it will move people who have unpacked.
              </span>
            </div>

            {proposal && (
              <>
                <div className="split" style={{ marginTop: 26 }}>
                  <span>
                    <span className="split__n num">{proposal.moves.length}</span>
                    <span className="meta">students placed</span>
                  </span>
                  <span>
                    <span className="split__n num">{real.length}</span>
                    <span className="meta">
                      actually change bed
                      {disrupted.length > 0 && `, ${disrupted.length} already in a room`}
                    </span>
                  </span>
                  <span>
                    <span className="split__n num">{proposal.sharedBeds}</span>
                    <span className="meta">beds reused between two stays</span>
                  </span>
                  <span>
                    <span className={`split__n num${proposal.unplaced.length ? ' split__n--bad' : ''}`}>
                      {proposal.unplaced.length}
                    </span>
                    <span className="meta">could not be placed</span>
                  </span>
                  <span>
                    <span className={`split__n num${proposal.languagePairs ? ' split__n--bad' : ''}`}>
                      {proposal.languagePairs}
                    </span>
                    <span className="meta">rooms sharing a first language</span>
                  </span>
                </div>

                {proposal.sharedBeds > 0 && (
                  <div className="alert">
                    <p className="label">Capacity found for nothing</p>
                    <p className="meta" style={{ margin: 0 }}>
                      {proposal.sharedBeds} beds take a second student once the
                      first has left. Allocating without looking at dates would
                      have needed {proposal.bedsUsed + proposal.sharedBeds} beds
                      for the same roll.
                    </p>
                  </div>
                )}

                {proposal.unplaced.length > 0 && (
                  <div className="alert alert--critical">
                    <p className="label">{proposal.unplaced.length} with nowhere to sleep</p>
                    <ul className="log">
                      {proposal.unplaced.slice(0, 8).map((u) => (
                        <li key={u.studentId}>
                          <button className="namebtn" onClick={() => setOpenStudent(u.studentId)}>
                            {u.name}
                          </button>
                          <span className="meta"> — {u.why}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {proposal.warnings.length > 0 && (
                  <>
                    <p className="label">
                      {proposal.warnings.length} rooms the rule could not keep
                    </p>
                    <ul className="log">
                      {proposal.warnings.slice(0, 6).map((w, i) => (
                        <li key={i}>
                          {roomLabel(w.roomId)} — {w.problem}
                        </li>
                      ))}
                      {proposal.warnings.length > 6 && (
                        <li className="meta">
                          …and {proposal.warnings.length - 6} more. There are only
                          so many first languages on the roll.
                        </li>
                      )}
                    </ul>
                  </>
                )}

                <p className="label">What would change</p>
                {real.length === 0 ? (
                  <p className="meta">
                    Nothing. Every student is already where the allocator would
                    put them.
                  </p>
                ) : (
                  <div className="tablewrap">
                    <table className="reg">
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>Student</th>
                          <th>Language</th>
                          <th>Stay</th>
                          <th>From</th>
                          <th>To</th>
                          <th style={{ width: '28%' }}>Why there</th>
                        </tr>
                      </thead>
                      <tbody>
                        {real.slice(0, 40).map((m) => {
                          const s = students.find((x) => x.id === m.studentId) as Student;
                          return (
                            <tr key={m.studentId}>
                              <td>
                                <button className="namebtn" onClick={() => setOpenStudent(m.studentId)}>
                                  {m.name}
                                </button>
                              </td>
                              <td className="meta">{s?.guardian.language}</td>
                              <td className="num meta">
                                {fmtDate(s.arrival)}–{fmtDate(s.leaving)}
                              </td>
                              <td className="meta">
                                {m.fromRoomId ? roomLabel(m.fromRoomId) : (
                                  <span className="mark mark--critical">None</span>
                                )}
                              </td>
                              <td>
                                {roomLabel(m.toRoomId)}
                                <span className="meta"> · bed {m.bed}</span>
                              </td>
                              <td className="meta">{m.because.join('; ')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {real.length > 40 && (
                      <p className="meta" style={{ marginTop: 12 }}>
                        Showing 40 of {real.length}.
                      </p>
                    )}
                  </div>
                )}

                <div className="editor__actions">
                  <button
                    className="btn btn--primary"
                    disabled={!role.canEditRecords || real.length === 0}
                    onClick={() => {
                      applyAllocation(proposal.moves);
                      setProposal(null);
                    }}
                  >
                    Apply {real.length} changes
                  </button>
                  <span className="meta">
                    {role.canEditRecords
                      ? 'Writes to every student record and to the safeguarding audit trail.'
                      : `${role.name} can plan but not apply.`}
                  </span>
                </div>

                {disrupted.length > 0 && (
                  <p className="mark mark--overdue" style={{ marginTop: 14 }}>
                    {disrupted.length} of these students are already in a room.
                    Moving somebody mid-stay is disruptive — check the list
                    before applying
                    {mode === 'from-scratch' ? ', or fill the gaps instead' : ''}.
                  </p>
                )}
              </>
            )}
            </div>

          </div>
        );
      })()}

      {view === 'rooms' && (
        <div className="rooms stagger">
          {roomRows.slice(0, 42).map((r, i) => {
            const list = occupants(r.id);
            const warden = wardenFor(r);
            const isOpen = openRoom === r.id;
            return (
              <div
                key={r.id}
                className={`room${isOpen ? ' room--on' : ''}`}
                style={{ animationDelay: `${Math.min(i * 14, 260)}ms` }}
              >
                <button
                  className="room__head"
                  onClick={() => setOpenRoom(isOpen ? null : r.id)}
                  aria-expanded={isOpen}
                >
                  <span className="room__no">{r.number}</span>
                  <span className="room__block">{r.block}</span>
                  <span className="meta room__band">
                    {r.band} · {list.length}/{r.beds} beds
                  </span>
                </button>

                <ul className="room__beds">
                  {list.map((o) => (
                    <li key={o.id}>
                      <button
                        className="room__bed"
                        onClick={() => setOpenStudent(o.id)}
                      >
                        <span className="room__bedno num">{o.bed}</span>
                        <span className="room__who">
                          {o.forename} {o.surname}
                        </span>
                        <span className="meta room__dates num">
                          {fmtDate(o.arrival)}–{fmtDate(o.leaving)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {Array.from({ length: r.beds - list.length }).map((_, k) => (
                    <li key={`free-${k}`} className="room__free meta">
                      Bed {list.length + k + 1} free
                    </li>
                  ))}
                </ul>

                {isOpen && (
                  <p className="meta room__warden">
                    Floor warden:{' '}
                    {warden ? (
                      <button className="namebtn" onClick={() => setOpenStaff(warden.id)}>
                        {warden.forename} {warden.surname}
                      </button>
                    ) : (
                      'Not assigned'
                    )}
                  </p>
                )}
              </div>
            );
          })}
          {roomRows.length > 42 && (
            <p className="meta">
              Showing 42 of {roomRows.length} rooms. Narrow with search.
            </p>
          )}
        </div>
      )}

      {view === 'arrivals' && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Student</th>
                <th>Arrives</th>
                <th>When</th>
                <th>Band</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Sharing with</th>
                <th style={{ width: '18%' }}>Admission</th>
                <th />
              </tr>
            </thead>
            <tbody className="stagger">
              {incoming.filter(matches).slice(0, 60).map((s, i) => {
                const mates = s.roomId
                  ? occupants(s.roomId).filter((o) => o.id !== s.id)
                  : [];
                return (
                  <tr key={s.id} style={{ animationDelay: `${Math.min(i * 12, 240)}ms` }}>
                    <td>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.country}
                      </span>
                    </td>
                    <td className="num">{fmtDate(s.arrival)}</td>
                    <td className="meta">{whenLabel(s.arrival)}</td>
                    <td className="num">{s.band}</td>
                    <td>
                      {s.roomId ? (
                        roomLabel(s.roomId)
                      ) : (
                        <span className="mark mark--critical">None</span>
                      )}
                    </td>
                    <td className="num">{s.bed || '—'}</td>
                    <td className="meta">
                      {mates.length
                        ? mates.map((m) => `${m.forename} ${m.surname}`).join(', ')
                        : 'Sole occupant'}
                    </td>
                    <td><ReadinessMark s={s} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn" onClick={() => setOpenStudent(s.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(view === 'students' || view === 'unallocated') && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Student</th>
                <th>Age</th>
                <th>Band</th>
                <th>Group</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Stay</th>
                <th style={{ width: '20%' }}>Parent or guardian</th>
                <th />
              </tr>
            </thead>
            <tbody className="stagger">
              {(view === 'unallocated' ? unallocated.filter(matches) : studentRows)
                .slice(0, 60)
                .map((s, i) => (
                  <tr key={s.id} style={{ animationDelay: `${Math.min(i * 12, 240)}ms` }}>
                    <td>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.country}
                      </span>
                    </td>
                    <td className="num">{s.age}</td>
                    <td className="num">{s.band}</td>
                    <td>{groupById(s.groupId).name}</td>
                    <td>
                      {s.roomId ? (
                        roomLabel(s.roomId)
                      ) : (
                        <span className="mark mark--overdue">Not allocated</span>
                      )}
                    </td>
                    <td className="num">{s.bed || '—'}</td>
                    <td className="num">
                      {fmtDate(s.arrival)}–{fmtDate(s.leaving)}
                    </td>
                    <td>
                      {s.guardian.name}
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.guardian.relationship} · {s.guardian.phone}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn" onClick={() => setOpenStudent(s.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'unallocated' && unallocated.length === 0 && (
        <p className="meta reminders__empty">
          Every student in the season has a bed.
        </p>
      )}
    </>
  );
}
