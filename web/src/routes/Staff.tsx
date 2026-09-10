import { Fragment, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { IconCheck, IconClose, IconEdit } from '../lib/icons';
import { useStore } from '../lib/store';
import {
  DEMO_TODAY, SLOTS, STAFF, WEEKLY_LIMIT, WEEK_DAYS, activityById, dayHours,
  dayName, fmtDate, fmtHours, groupById, sessionsFor, weeklyHours,
  type DbsState, type Session, type Staff as StaffRec,
} from '../data/seed';

const DUTY_ROLES = ['Safeguarding lead', 'Welfare officer'];

/* Rota'd hours against the contract. Payroll is out of scope (DECISIONS 0001)
   — this is the rota's own number, not pay. */
function HoursMark({ hours, contracted }: { hours: number; contracted: number }) {
  if (hours > WEEKLY_LIMIT) {
    return (
      <span className="mark mark--critical">
        {fmtHours(hours)} · over {WEEKLY_LIMIT}h
      </span>
    );
  }
  if (hours > contracted) {
    return (
      <span className="mark mark--overdue">
        {fmtHours(hours)} · over contract
      </span>
    );
  }
  if (hours === 0) return <span className="mark mark--idle">No sessions</span>;
  return <span className="mark mark--clear">{fmtHours(hours)}</span>;
}

function Schedule({
  rec,
  sessions,
  onClose,
}: {
  rec: StaffRec;
  sessions: Session[];
  onClose: () => void;
}) {
  const mine = sessionsFor(rec.id, sessions);
  const hours = weeklyHours(rec.id, sessions);

  return (
    <div className="sched">
      <div className="sched__head">
        <div>
          <h3 className="sched__title">
            {rec.forename} {rec.surname} &mdash; this week
          </h3>
          <p className="meta sched__sub">
            {mine.length} sessions &middot; {fmtHours(hours)} rota&rsquo;d of{' '}
            {fmtHours(rec.contractedHours)} contracted
            {hours > WEEKLY_LIMIT
              ? ` · over the ${WEEKLY_LIMIT}h working-time limit, needs a signed opt-out`
              : ''}
          </p>
        </div>
        <button className="btn btn--quiet" onClick={onClose} aria-label="Close schedule">
          <IconClose />
        </button>
      </div>

      {mine.length === 0 ? (
        <p className="meta">
          {DUTY_ROLES.includes(rec.role)
            ? 'A duty role — they hold safeguarding and welfare cover rather than running activity sessions, so they carry no session rota.'
            : 'Not on the rota this week. '}
          {DUTY_ROLES.includes(rec.role) ? '' : rec.dbs.state !== 'cleared'
            ? 'Their DBS is not cleared, so they cannot be rota\u2019d with students.'
            : 'Assign them from the timetable.'}
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
                      {fmtHours(dayHours(rec.id, d, sessions))}
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
                    const on = mine.find(
                      (x) => x.day === d && x.start === slot.start,
                    );
                    return (
                      <td key={d}>
                        {on ? (
                          <span className="shift">
                            <span className="shift__what">
                              {activityById(on.activityId).name}
                            </span>
                            <span className="meta shift__who">
                              {groupById(on.groupId).name}
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
      )}
    </div>
  );
}

const DBS_COPY: Record<DbsState, { label: string; mark: string; note: string }> = {
  cleared: { label: 'Cleared', mark: 'mark--clear', note: 'Enhanced check on file' },
  expiring: { label: 'Expiring', mark: 'mark--overdue', note: 'Renewal due — chase now' },
  pending: { label: 'Pending', mark: 'mark--overdue', note: 'Submitted, awaiting result' },
  missing: { label: 'Not on file', mark: 'mark--critical', note: 'Must not be rota’d with students' },
};

function daysUntil(iso: string) {
  return Math.round(
    (new Date(iso).getTime() - DEMO_TODAY.getTime()) / 86400000,
  );
}

function Editor({
  rec,
  onSave,
  onCancel,
}: {
  rec: StaffRec;
  onSave: (next: StaffRec) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<DbsState>(rec.dbs.state);
  const [certificate, setCertificate] = useState(rec.dbs.certificate ?? '');
  const [issued, setIssued] = useState(rec.dbs.issued ?? '');
  const [expires, setExpires] = useState(rec.dbs.expires ?? '');
  const [phone, setPhone] = useState(rec.phone);
  const [role, setRole] = useState(rec.role);

  const needsCert = state === 'cleared' || state === 'expiring';
  const certMissing = needsCert && certificate.trim().length === 0;
  const datesMissing = needsCert && (!issued || !expires);

  return (
    <div className="editor">
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
            onChange={(e) => setCertificate(e.target.value)}
            aria-invalid={certMissing}
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
            onChange={(e) => setExpires(e.target.value)}
          />
        </label>
      </div>

      {(certMissing || datesMissing) && (
        <p className="mark mark--critical" style={{ marginTop: 14 }}>
          {certMissing
            ? 'A cleared or expiring check needs its certificate number.'
            : 'A cleared or expiring check needs both dates.'}
        </p>
      )}

      <div className="editor__actions">
        <button
          className="btn btn--primary"
          disabled={certMissing || datesMissing}
          onClick={() =>
            onSave({
              ...rec,
              role,
              phone,
              dbs: {
                state,
                certificate: needsCert ? certificate.trim() : null,
                issued: needsCert ? issued : null,
                expires: needsCert ? expires : null,
              },
            })
          }
        >
          <IconCheck />
          Save record
        </button>
        <button className="btn" onClick={onCancel}>
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

export function Staff() {
  const { sessions } = useStore();
  const [staff, setStaff] = useState<StaffRec[]>(STAFF);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const blocked = staff.filter(
    (s) => s.dbs.state === 'missing' || s.dbs.state === 'pending',
  );

  const totalHours = staff.reduce((n, s) => n + weeklyHours(s.id, sessions), 0);
  const overLimit = staff.filter((s) => weeklyHours(s.id, sessions) > WEEKLY_LIMIT);

  return (
    <>
      <SectionHead
        title="Staff"
        count={`${staff.length} on the roster · ${fmtHours(totalHours)} rota'd this week`}
      />

      <p className="meta section__lede">
        Hours are what the rota schedules, not what anyone is paid — payroll
        stays with the centre. Open a name for that person&rsquo;s week.
      </p>

      {overLimit.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {overLimit.length} staff rota&rsquo;d past the {WEEKLY_LIMIT}h
          working-time limit
        </p>
      )}

      {blocked.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 22 }}>
          {blocked.length} staff without a cleared DBS. They cannot be rota&rsquo;d
          with students.
        </p>
      )}

      <div className="tablewrap">
        <table className="reg">
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Name</th>
            <th>Age</th>
            <th style={{ width: '17%' }}>Role</th>
            <th style={{ width: '12%' }}>Hours / week</th>
            <th style={{ width: '12%' }}>Age bands</th>
            <th style={{ width: '22%' }}>DBS</th>
            <th>Qualifications</th>
            <th />
          </tr>
        </thead>
        <tbody className="stagger">
          {staff.map((s, i) => {
            const dbs = DBS_COPY[s.dbs.state];
            const until = s.dbs.expires ? daysUntil(s.dbs.expires) : null;
            const isEditing = editing === s.id;
            return (
              <Fragment key={s.id}>
                <tr style={{ animationDelay: `${i * 26}ms` }}>
                  <td>
                    <button
                      className="namebtn"
                      onClick={() =>
                        setViewing(viewing === s.id ? null : s.id)
                      }
                      aria-expanded={viewing === s.id}
                    >
                      {s.forename} {s.surname}
                    </button>
                    {s.safeguardingLead && (
                      <span
                        className="meta"
                        style={{ display: 'block', color: 'var(--info)' }}
                      >
                        Safeguarding lead
                      </span>
                    )}
                    <span
                      className="meta"
                      style={{ display: 'block', color: 'var(--ink-3)' }}
                    >
                      {s.email}
                    </span>
                  </td>
                  <td className="num">{s.age}</td>
                  <td>{s.role}</td>
                  <td>
                    <HoursMark
                      hours={weeklyHours(s.id, sessions)}
                      contracted={s.contractedHours}
                    />
                    <span
                      className="meta"
                      style={{ display: 'block', color: 'var(--ink-3)' }}
                    >
                      {DUTY_ROLES.includes(s.role)
                        ? 'Duty role, not activity sessions'
                        : `of ${fmtHours(s.contractedHours)} contracted`}
                    </span>
                  </td>
                  <td className="num meta">{s.bands.join(', ')}</td>
                  <td>
                    <span className={`mark ${dbs.mark}`}>{dbs.label}</span>
                    <span
                      className="meta num"
                      style={{ display: 'block', color: 'var(--ink-3)' }}
                    >
                      {s.dbs.certificate ?? dbs.note}
                    </span>
                    {s.dbs.expires && (
                      <span
                        className="meta num"
                        style={{
                          display: 'block',
                          color:
                            until !== null && until < 0
                              ? 'var(--oxide)'
                              : until !== null && until < 30
                              ? 'var(--ochre)'
                              : 'var(--ink-3)',
                        }}
                      >
                        {until !== null && until < 0
                          ? `Expired ${fmtDate(s.dbs.expires)} · ${Math.abs(until)} days ago`
                          : `Expires ${fmtDate(s.dbs.expires)}${
                              until !== null && until < 60 ? ` · ${until} days` : ''
                            }`}
                      </span>
                    )}
                  </td>
                  <td className="meta">{s.quals.join(' · ')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--quiet"
                      onClick={() => setEditing(isEditing ? null : s.id)}
                      aria-expanded={isEditing}
                    >
                      <IconEdit />
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                  </td>
                </tr>
                {viewing === s.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <Schedule
                        rec={s}
                        sessions={sessions}
                        onClose={() => setViewing(null)}
                      />
                    </td>
                  </tr>
                )}
                {isEditing && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, borderBottom: '1px solid var(--rule-strong)' }}>
                      <Editor
                        rec={s}
                        onCancel={() => setEditing(null)}
                        onSave={(next) => {
                          setStaff((all) =>
                            all.map((x) => (x.id === next.id ? next : x)),
                          );
                          setEditing(null);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
        </div>
    </>
  );
}
