import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { ReadinessMark } from '../components/StudentReadiness';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import {
  ROOMS, STUDENTS, fmtDate, groupById, occupants, roomLabel, upcomingArrivals,
  wardenFor, whenLabel,
} from '../data/seed';

type View = 'rooms' | 'students' | 'unallocated' | 'arrivals';

export function Rooms() {
  const { students } = useStore();
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
