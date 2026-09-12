import { useState } from 'react';
import { Drawer, DrawerTabs } from './Drawer';
import { IconCheck, IconClose, IconEdit } from '../lib/icons';
import { useStore } from '../lib/store';
import { LEVEL_COPY } from '../data/incidents';
import {
  DEMO_TODAY, SLOTS, WEEKLY_LIMIT, WEEK_DAYS, activityById, dayHours, dayName,
  fmtDate, fmtDateLong, fmtHours, groupById, isAway, sessionsFor, weeklyHours,
  type Away, type DbsState, type Staff,
} from '../data/seed';

type Tab = 'record' | 'week' | 'away' | 'history';

const DUTY_ROLES = ['Safeguarding lead', 'Welfare officer'];

export const DBS_COPY: Record<DbsState, { label: string; mark: string; note: string }> = {
  cleared: { label: 'Cleared', mark: 'mark--clear', note: 'Enhanced check on file' },
  expiring: { label: 'Expiring', mark: 'mark--overdue', note: 'Renewal due — chase now' },
  pending: { label: 'Pending', mark: 'mark--overdue', note: 'Submitted, awaiting result' },
  missing: { label: 'Not on file', mark: 'mark--critical', note: 'Must not be rota’d with students' },
};

function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - DEMO_TODAY.getTime()) / 86400000);
}

function Editor({ rec, onDone }: { rec: Staff; onDone: () => void }) {
  const { saveStaff } = useStore();
  const [state, setState] = useState<DbsState>(rec.dbs.state);
  const [certificate, setCertificate] = useState(rec.dbs.certificate ?? '');
  const [issued, setIssued] = useState(rec.dbs.issued ?? '');
  const [expires, setExpires] = useState(rec.dbs.expires ?? '');
  const [phone, setPhone] = useState(rec.phone);
  const [role, setRole] = useState(rec.role);
  const [contracted, setContracted] = useState(String(rec.contractedHours));

  const needsCert = state === 'cleared' || state === 'expiring';
  const certMissing = needsCert && certificate.trim().length === 0;
  const datesMissing = needsCert && (!issued || !expires);
  const lapsed = needsCert && expires !== '' && new Date(expires) < DEMO_TODAY;
  const hoursBad = Number.isNaN(Number(contracted)) || Number(contracted) <= 0;

  return (
    <div className="editor editor--flush">
      <div className="editor__grid">
        <label className="editor__f">
          <span className="label">Role</span>
          <input className="field" value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <label className="editor__f">
          <span className="label">Phone</span>
          <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="editor__f">
          <span className="label">Contracted hours</span>
          <input
            className="field"
            value={contracted}
            aria-invalid={hoursBad}
            onChange={(e) => setContracted(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">DBS status</span>
          <select
            className="field"
            value={state}
            onChange={(e) => setState(e.target.value as DbsState)}
          >
            <option value="cleared">Cleared</option>
            <option value="expiring">Expiring</option>
            <option value="pending">Pending</option>
            <option value="missing">Not on file</option>
          </select>
        </label>
        <label className="editor__f">
          <span className="label">Certificate number</span>
          <input
            className="field"
            value={certificate}
            placeholder={needsCert ? 'DBS 0000 0000 0000' : 'Not applicable'}
            disabled={!needsCert}
            aria-invalid={certMissing}
            onChange={(e) => setCertificate(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">Issued</span>
          <input
            type="date"
            className="field"
            value={issued}
            disabled={!needsCert}
            onChange={(e) => setIssued(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">Expires</span>
          <input
            type="date"
            className="field"
            value={expires}
            disabled={!needsCert}
            aria-invalid={lapsed}
            onChange={(e) => setExpires(e.target.value)}
          />
        </label>
      </div>

      {(certMissing || datesMissing || lapsed || hoursBad) && (
        <p className="mark mark--critical" style={{ marginTop: 14 }}>
          {certMissing
            ? 'A cleared or expiring check needs its certificate number.'
            : datesMissing
            ? 'A cleared or expiring check needs both dates.'
            : lapsed
            ? 'That expiry is in the past. A lapsed check is not cleared — set the status to expiring or not on file.'
            : 'Contracted hours must be a number above zero.'}
        </p>
      )}

      <div className="editor__actions">
        <button
          className="btn btn--primary"
          disabled={certMissing || datesMissing || lapsed || hoursBad}
          onClick={() => {
            saveStaff({
              ...rec,
              role,
              phone,
              contractedHours: Number(contracted),
              dbs: {
                state,
                certificate: needsCert ? certificate.trim() : null,
                issued: needsCert ? issued : null,
                expires: needsCert ? expires : null,
              },
            });
            onDone();
          }}
        >
          <IconCheck />
          Save record
        </button>
        <button className="btn" onClick={onDone}>
          <IconClose />
          Cancel
        </button>
        <span className="meta" style={{ color: 'var(--ink-3)' }}>
          Every change to a DBS record is written to the safeguarding audit trail.
        </span>
      </div>
    </div>
  );
}

function AwayEditor({ rec }: { rec: Staff }) {
  const { saveStaff } = useStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  const bad = !from || !to || to < from;

  return (
    <div className="awayadd">
      <div className="editor__grid">
        <label className="editor__f">
          <span className="label">From</span>
          <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="editor__f">
          <span className="label">To</span>
          <input
            type="date"
            className="field"
            value={to}
            aria-invalid={Boolean(from && to && to < from)}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">Reason</span>
          <input
            className="field"
            value={reason}
            placeholder="Booked leave"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      {from && to && to < from && (
        <p className="mark mark--critical" style={{ marginTop: 12 }}>
          The end date is before the start date.
        </p>
      )}
      <div className="editor__actions">
        <button
          className="btn btn--primary"
          disabled={bad}
          onClick={() => {
            const next: Away = { from, to, reason: reason.trim() || 'Unavailable' };
            saveStaff({ ...rec, away: [...rec.away, next] });
            setFrom('');
            setTo('');
            setReason('');
          }}
        >
          <IconCheck />
          Record unavailability
        </button>
        <span className="meta" style={{ color: 'var(--ink-3)' }}>
          Anything already rota&rsquo;d inside these dates is flagged as a clash
          on the timetable, not silently reassigned.
        </span>
      </div>
    </div>
  );
}

export function StaffProfile({ id, onClose }: { id: string; onClose: () => void }) {
  const { staff, sessions, reminders, incidents, audit, role } = useStore();
  const [tab, setTab] = useState<Tab>('record');
  const [editing, setEditing] = useState(false);
  const { saveStaff } = useStore();

  const rec = staff.find((x) => x.id === id);
  if (!rec) return null;

  const mine = sessionsFor(rec.id, sessions);
  const hours = weeklyHours(rec.id, sessions);
  const dbs = DBS_COPY[rec.dbs.state];
  const until = rec.dbs.expires ? daysUntil(rec.dbs.expires) : null;
  const name = `${rec.forename} ${rec.surname}`;
  const theirs = reminders.filter((x) => !x.done && x.title.startsWith(name));
  const involved = incidents.filter((i) => i.staffIds.includes(rec.id));
  const trail = audit.filter((a) => a.subject.includes(name));
  const clashes = mine.filter((s) => isAway(rec, s.day));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'record', label: 'Record' },
    { id: 'week', label: `Their week ${mine.length}` },
    { id: 'away', label: `Availability${clashes.length ? ' ·' : ''}` },
    { id: 'history', label: `History ${involved.length + trail.length}` },
  ];

  return (
    <Drawer
      title={name}
      sub={
        <>
          {rec.role} · {rec.age} · {rec.bands.join(', ')} ·{' '}
          {fmtHours(hours)} rota&rsquo;d of {fmtHours(rec.contractedHours)} contracted
        </>
      }
      tag={<span className={`mark ${dbs.mark}`}>DBS {dbs.label.toLowerCase()}</span>}
      onClose={onClose}
      foot={
        role.canEditRecords ? (
          <button
            className={`btn${editing ? '' : ' btn--primary'}`}
            onClick={() => setEditing((v) => !v)}
          >
            <IconEdit />
            {editing ? 'Close editor' : 'Edit record'}
          </button>
        ) : (
          <span className="meta">
            {role.name} can read this record but not change it.
          </span>
        )
      }
    >
      <DrawerTabs tabs={tabs} value={tab} onChange={setTab} />

      {editing && role.canEditRecords && (
        <Editor rec={rec} onDone={() => setEditing(false)} />
      )}

      {tab === 'record' && (
        <>
          {rec.dbs.state !== 'cleared' && (
            <div className="alert alert--critical">
              <p className="label">Cannot be rota&rsquo;d with students</p>
              <p className="meta" style={{ margin: 0 }}>{dbs.note}.</p>
            </div>
          )}
          {clashes.length > 0 && (
            <div className="alert alert--critical">
              <p className="label">{clashes.length} rota&rsquo;d sessions clash with their availability</p>
              <p className="meta" style={{ margin: 0 }}>
                The draft was built before they said they were away. Re-slot them
                on the timetable.
              </p>
            </div>
          )}

          <p className="label">Contact</p>
          <dl className="pairs">
            <div className="pairs__pair"><dt>Phone</dt><dd className="num">{rec.phone}</dd></div>
            <div className="pairs__pair"><dt>Email</dt><dd className="pairs__wrap">{rec.email}</dd></div>
            <div className="pairs__pair"><dt>Date of birth</dt><dd>{fmtDateLong(rec.dob)}</dd></div>
            <div className="pairs__pair"><dt>Age</dt><dd className="num">{rec.age}</dd></div>
          </dl>

          <p className="label">DBS</p>
          <dl className="pairs">
            <div className="pairs__pair">
              <dt>Status</dt>
              <dd><span className={`mark ${dbs.mark}`}>{dbs.label}</span></dd>
            </div>
            <div className="pairs__pair">
              <dt>Certificate</dt>
              <dd className="num">{rec.dbs.certificate ?? 'None on file'}</dd>
            </div>
            <div className="pairs__pair">
              <dt>Issued</dt>
              <dd className="num">{rec.dbs.issued ? fmtDateLong(rec.dbs.issued) : '—'}</dd>
            </div>
            <div className="pairs__pair">
              <dt>Expires</dt>
              <dd
                className="num"
                style={{
                  color:
                    until !== null && until < 0
                      ? 'var(--oxide)'
                      : until !== null && until < 60
                      ? 'var(--ochre)'
                      : undefined,
                }}
              >
                {rec.dbs.expires
                  ? until !== null && until < 0
                    ? `Expired ${fmtDate(rec.dbs.expires)} · ${Math.abs(until)} days ago`
                    : `${fmtDateLong(rec.dbs.expires)}${until !== null && until < 90 ? ` · ${until} days` : ''}`
                  : '—'}
              </dd>
            </div>
          </dl>

          <p className="label">Qualifications</p>
          <ul className="log">
            {rec.quals.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>

          <p className="label">Rota</p>
          <dl className="pairs">
            <div className="pairs__pair">
              <dt>This week</dt>
              <dd className="num">
                {fmtHours(hours)}
                {hours > WEEKLY_LIMIT && (
                  <span className="mark mark--critical" style={{ marginLeft: 8 }}>
                    over {WEEKLY_LIMIT}h
                  </span>
                )}
              </dd>
            </div>
            <div className="pairs__pair"><dt>Contracted</dt><dd className="num">{fmtHours(rec.contractedHours)}</dd></div>
            <div className="pairs__pair"><dt>Sessions</dt><dd className="num">{mine.length}</dd></div>
            <div className="pairs__pair"><dt>Age bands</dt><dd>{rec.bands.join(', ')}</dd></div>
          </dl>

          {theirs.length > 0 && (
            <>
              <p className="label">Outstanding against this person</p>
              <ul className="log">
                {theirs.map((x) => (
                  <li key={x.id}>
                    {x.title}
                    <span className="meta"> · chased {x.chases.length}×</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {tab === 'week' && (
        mine.length === 0 ? (
          <p className="meta">
            {DUTY_ROLES.includes(rec.role)
              ? 'A duty role — they hold safeguarding and welfare cover rather than running activity sessions, so they carry no session rota.'
              : rec.dbs.state !== 'cleared'
              ? 'Their DBS is not cleared, so they cannot be rota’d with students.'
              : 'Not on the rota this week. Assign them from the timetable.'}
          </p>
        ) : (
          <div className="tablewrap">
            <table className="sched__grid">
              <thead>
                <tr>
                  <th />
                  {WEEK_DAYS.map((d) => (
                    <th key={d} scope="col">
                      <span className="sched__day">{dayName(d)}</span>
                      <span className="meta sched__dayh">
                        {isAway(rec, d) ? 'away' : fmtHours(dayHours(rec.id, d, sessions))}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot.start}>
                    <th scope="row" className="sched__slot num">
                      {slot.start}
                      <span className="meta">{slot.end}</span>
                    </th>
                    {WEEK_DAYS.map((d) => {
                      const on = mine.find((x) => x.day === d && x.start === slot.start);
                      const clash = on && isAway(rec, d);
                      return (
                        <td key={d}>
                          {on ? (
                            <span className={`shift${clash ? ' shift--clash' : ''}`}>
                              <span className="shift__what">
                                {activityById(on.activityId).name}
                              </span>
                              <span className="meta shift__who">
                                {clash ? 'clashes — away' : groupById(on.groupId).name}
                              </span>
                            </span>
                          ) : (
                            <span className="shift shift--off" aria-label="Off" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'away' && (
        <>
          <p className="meta" style={{ margin: '0 0 18px' }}>
            What this person has told the centre they cannot work. The rota
            builder checks it alongside qualifications and ratios — a clash is
            flagged for a person to re-slot, never reassigned behind their back.
          </p>

          {rec.away.length === 0 ? (
            <p className="meta">Nothing recorded. Available all season.</p>
          ) : (
            <ul className="log">
              {rec.away.map((a, i) => (
                <li key={i}>
                  <span className="num">
                    {fmtDate(a.from)}
                    {a.to !== a.from ? `–${fmtDate(a.to)}` : ''}
                  </span>{' '}
                  · {a.reason}
                  {role.canEditRecords && (
                    <button
                      className="btn btn--quiet"
                      style={{ marginLeft: 10 }}
                      onClick={() =>
                        saveStaff({
                          ...rec,
                          away: rec.away.filter((_, k) => k !== i),
                        })
                      }
                      aria-label={`Remove unavailability from ${a.from}`}
                    >
                      <IconClose />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {clashes.length > 0 && (
            <>
              <p className="label">Clashes with the current rota</p>
              <ul className="log">
                {clashes.map((s) => (
                  <li key={s.id}>
                    {fmtDate(s.day)} {s.start} · {activityById(s.activityId).name} ·{' '}
                    {groupById(s.groupId).name}
                  </li>
                ))}
              </ul>
            </>
          )}

          {role.canEditRecords && <AwayEditor rec={rec} />}
        </>
      )}

      {tab === 'history' && (
        <>
          <p className="label">Incidents attended</p>
          {involved.length === 0 ? (
            <p className="meta">None recorded.</p>
          ) : (
            <ul className="log">
              {involved.map((i) => (
                <li key={i.id}>
                  <span className={`mark ${LEVEL_COPY[i.level].mark}`}>
                    {LEVEL_COPY[i.level].label}
                  </span>{' '}
                  {i.kind} · {i.where}
                  <span className="meta" style={{ display: 'block' }}>
                    {i.at.replace('T', ' ')} · {i.what}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="label">Audit trail</p>
          {trail.length === 0 ? (
            <p className="meta">No entries name this person yet.</p>
          ) : (
            <ul className="log">
              {trail.slice(0, 12).map((a) => (
                <li key={a.id}>
                  {a.action}
                  <span className="meta" style={{ display: 'block' }}>
                    {a.at} · {a.actor} · {a.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}
