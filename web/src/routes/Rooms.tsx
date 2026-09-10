import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { IconClose } from '../lib/icons';
import { ReadinessMark } from '../components/StudentReadiness';
import {
  ROOMS, STUDENTS, fmtDate, fmtDateLong, fmtMoney, groupById,
  isOnSite, nights, occupants, roomById, roomLabel, upcomingArrivals,
  wardenFor, whenLabel, type Student,
} from '../data/seed';

type View = 'rooms' | 'students' | 'unallocated' | 'arrivals';

function DocLine({ s }: { s: Student }) {
  const late = (Object.entries(s.docs) as [string, string][]).filter(
    ([, v]) => v !== 'in',
  );
  if (!late.length) return <span className="mark mark--clear">All documents in</span>;
  return (
    <span className={`mark ${late.some(([, v]) => v === 'overdue') ? 'mark--critical' : 'mark--overdue'}`}>
      {late.map(([k]) => k).join(', ')} outstanding
    </span>
  );
}

function Detail({ s, onClose }: { s: Student; onClose: () => void }) {
  const room = roomById(s.roomId);
  const mates = s.roomId
    ? occupants(s.roomId).filter((o) => o.id !== s.id)
    : [];
  const warden = room ? wardenFor(room) : null;
  const g = s.guardian;
  const owed = s.balancePence - s.paidPence;

  return (
    <div className="detail">
      <div className="detail__head">
        <div>
          <h3 className="detail__name">
            {s.forename} {s.surname}
          </h3>
          <p className="meta detail__sub">
            {s.age} · {s.band} · {groupById(s.groupId).name} · {s.country}
            {isOnSite(s) ? ' · on site' : ' · not yet arrived'}
          </p>
        </div>
        <button className="btn btn--quiet" onClick={onClose} aria-label="Close details">
          <IconClose />
        </button>
      </div>

      <div className="detail__grid">
        <section className="detail__col">
          <p className="label">Residence</p>
          <dl className="pairs">
            <dt>Room</dt>
            <dd>{roomLabel(s.roomId)}</dd>
            <dt>Floor</dt>
            <dd>{room ? room.floor : '—'}</dd>
            <dt>Bed</dt>
            <dd>{s.bed || '—'}</dd>
            <dt>Warden</dt>
            <dd>
              {warden ? `${warden.forename} ${warden.surname}` : 'Not assigned'}
            </dd>
            <dt>Sharing with</dt>
            <dd>
              {mates.length
                ? mates.map((m) => `${m.forename} ${m.surname}`).join(', ')
                : 'Sole occupant'}
            </dd>
          </dl>

          <p className="label">Stay</p>
          <dl className="pairs">
            <dt>Arrives</dt>
            <dd>{fmtDateLong(s.arrival)}</dd>
            <dt>Leaves</dt>
            <dd>{fmtDateLong(s.leaving)}</dd>
            <dt>Nights</dt>
            <dd>{nights(s)}</dd>
            <dt>Date of birth</dt>
            <dd>{fmtDateLong(s.dob)}</dd>
          </dl>
        </section>

        <section className="detail__col">
          <p className="label">Parent or guardian</p>
          <dl className="pairs">
            <dt>Name</dt>
            <dd>
              {g.name}
              <span className="meta"> · {g.relationship}</span>
            </dd>
            <dt>Phone</dt>
            <dd>{g.phone}</dd>
            <dt>Alternate</dt>
            <dd>{g.altPhone}</dd>
            <dt>Email</dt>
            <dd className="pairs__wrap">{g.email}</dd>
            <dt>Address</dt>
            <dd className="pairs__wrap">{g.address}</dd>
            <dt>Language</dt>
            <dd>
              {g.language}
              {g.language !== 'English' && (
                <span className="meta"> · send reminders in plain English</span>
              )}
            </dd>
          </dl>

          <p className="label">Emergency contact</p>
          <dl className="pairs">
            <dt>Name</dt>
            <dd>{g.emergencyName}</dd>
            <dt>Phone</dt>
            <dd>{g.emergencyPhone}</dd>
          </dl>
        </section>

        <section className="detail__col">
          <p className="label">Welfare</p>
          <dl className="pairs">
            <dt>Dietary</dt>
            <dd>{s.dietary ?? 'None recorded'}</dd>
            <dt>Medical</dt>
            <dd>{s.medical ?? 'None recorded'}</dd>
            <dt>Off-site travel</dt>
            <dd>
              {g.consentToTravel ? (
                <span className="mark mark--clear">Consented</span>
              ) : (
                <span className="mark mark--critical">No consent on file</span>
              )}
            </dd>
          </dl>

          <p className="label">Documents and payment</p>
          <dl className="pairs">
            <dt>Documents</dt>
            <dd>
              <DocLine s={s} />
            </dd>
            <dt>Invoiced</dt>
            <dd>{fmtMoney(s.balancePence)}</dd>
            <dt>Outstanding</dt>
            <dd>
              {owed > 0 ? (
                <span className="mark mark--overdue">{fmtMoney(owed)}</span>
              ) : (
                <span className="mark mark--clear">Paid in full</span>
              )}
            </dd>
          </dl>
        </section>
      </div>
    </div>
  );
}

export function Rooms() {
  const [view, setView] = useState<View>('rooms');
  const [q, setQ] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [openRoom, setOpenRoom] = useState<string | null>(null);

  const unallocated = useMemo(
    () => STUDENTS.filter((s) => !s.roomId),
    [],
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
  const detail = openStudent
    ? STUDENTS.find((s) => s.id === openStudent) ?? null
    : null;

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

      {detail && <Detail s={detail} onClose={() => setOpenStudent(null)} />}

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
                    {warden ? `${warden.forename} ${warden.surname}` : 'Not assigned'}
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
                      <span style={{ fontWeight: 600 }}>
                        {s.forename} {s.surname}
                      </span>
                      <span className="meta" style={{ display: 'block', color: 'var(--bone-3)' }}>
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
                      <span style={{ fontWeight: 600 }}>
                        {s.forename} {s.surname}
                      </span>
                      <span className="meta" style={{ display: 'block', color: 'var(--bone-3)' }}>
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
                      <span className="meta" style={{ display: 'block', color: 'var(--bone-3)' }}>
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
