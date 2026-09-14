import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReadinessMark } from '../components/StudentReadiness';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import {
  ROOMS, fmtDate, groupById, roomLabel, upcomingArrivals, wardenFor,
  whenLabel, type Student,
} from '../data/seed';
import { changed, propose, type Mode, type Proposal } from '../lib/allocate';

type View = 'rooms' | 'students' | 'unallocated' | 'arrivals' | 'plan';

export function Rooms() {
  const { students, rooming, applyAllocation, role } = useStore();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<Mode>('fill-gaps');

  /* Occupancy comes from the store, not the seed — the allocator changes it. */
  const STUDENTS = students;
  const occupants = (roomId: string) =>
    students.filter((s) => s.roomId === roomId).sort((a, b) => a.bed - b.bed);
  const [view, setView] = useState<View>('rooms');
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [q, setQ] = useState('');
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


  const tabs: { id: View; label: string }[] = [
    { id: 'rooms', label: `By room ${used.length}` },
    { id: 'students', label: `By student ${STUDENTS.length}` },
    { id: 'arrivals', label: `Still to arrive ${incoming.length}` },
    { id: 'unallocated', label: `Unallocated ${unallocated.length}` },
    { id: 'plan', label: 'Plan the beds' },
  ];

  return (
    <>
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

      <p className="meta section__lede">
        Rooms are allocated inside one age band. Whether a centre also rooms by
        gender is a per-centre configuration, specified in October, so it is not
        modelled here rather than guessed. Open any student for their full record
        and their parent or guardian&rsquo;s contact details.
      </p>

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
          <div className="plan2">
            <p className="meta section__lede">
              The allocator fills every bed against the centre&rsquo;s rooming
              rules and shows what it would change before anything moves. It
              proposes; you apply it. Rules are set in Centre setup — right now:{' '}
              <strong>{rulesLine}</strong>.
            </p>

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
              <button
                className="btn btn--primary"
                onClick={() => {
                  setMode('fill-gaps');
                  setProposal(propose(students, rooming, ROOMS, 'fill-gaps'));
                }}
              >
                Fill the gaps
              </button>
              <button
                className="btn"
                onClick={() => {
                  setMode('from-scratch');
                  setProposal(propose(students, rooming, ROOMS, 'from-scratch'));
                }}
              >
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
