import { Fragment, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { IconCheck, IconClose, IconEdit } from '../lib/icons';
import {
  DEMO_TODAY, STAFF, fmtDate, type DbsState, type Staff as StaffRec,
} from '../data/seed';

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
        <span className="meta" style={{ color: 'var(--bone-3)' }}>
          Every change to a DBS record is written to the safeguarding audit trail.
        </span>
      </div>
    </div>
  );
}

export function Staff() {
  const [staff, setStaff] = useState<StaffRec[]>(STAFF);
  const [editing, setEditing] = useState<string | null>(null);

  const blocked = staff.filter(
    (s) => s.dbs.state === 'missing' || s.dbs.state === 'pending',
  );

  return (
    <>
      <SectionHead title="Staff" count={`${staff.length} on the season roster`} />

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
            <th style={{ width: '15%' }}>Age bands</th>
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
                    <span style={{ fontWeight: 500 }}>
                      {s.forename} {s.surname}
                    </span>
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
                      style={{ display: 'block', color: 'var(--bone-3)' }}
                    >
                      {s.email}
                    </span>
                  </td>
                  <td className="num">{s.age}</td>
                  <td>{s.role}</td>
                  <td className="num meta">{s.bands.join(', ')}</td>
                  <td>
                    <span className={`mark ${dbs.mark}`}>{dbs.label}</span>
                    <span
                      className="meta num"
                      style={{ display: 'block', color: 'var(--bone-3)' }}
                    >
                      {s.dbs.certificate ?? dbs.note}
                    </span>
                    {s.dbs.expires && (
                      <span
                        className="meta num"
                        style={{
                          display: 'block',
                          color: until !== null && until < 30 ? 'var(--ochre)' : 'var(--bone-3)',
                        }}
                      >
                        Expires {fmtDate(s.dbs.expires)}
                        {until !== null && until < 60 ? ` · ${until} days` : ''}
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
                {isEditing && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid var(--rule-strong)' }}>
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
