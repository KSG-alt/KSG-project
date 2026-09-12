import { useMemo, useState } from 'react';
import { Drawer, DrawerTabs } from './Drawer';
import { IconCheck, IconClose, IconEdit } from '../lib/icons';
import { useStore } from '../lib/store';
import { invoiceRef, owed } from '../data/finance';
import { LEVEL_COPY } from '../data/incidents';
import {
  SLOTS, activityById, dayName, fmtDate, fmtDateLong, fmtMoney, groupById,
  isOnSite, nights, occupants, readiness, roomById, roomLabel, staffById,
  wardenFor, type DocState, type Student,
} from '../data/seed';

type Tab = 'record' | 'stay' | 'guardian' | 'week' | 'money' | 'history';

const DOC_COPY: Record<DocState, { label: string; mark: string }> = {
  in: { label: 'In', mark: 'mark--clear' },
  outstanding: { label: 'Outstanding', mark: 'mark--idle' },
  overdue: { label: 'Overdue', mark: 'mark--critical' },
};

const DOC_NAMES: Record<string, string> = {
  medical: 'Medical form',
  consent: 'Consent form',
  passport: 'Passport copy',
};

function Editor({ s, onDone }: { s: Student; onDone: () => void }) {
  const { saveStudent } = useStore();
  const [dietary, setDietary] = useState(s.dietary ?? '');
  const [medical, setMedical] = useState(s.medical ?? '');
  const [phone, setPhone] = useState(s.guardian.phone);
  const [email, setEmail] = useState(s.guardian.email);
  const [docs, setDocs] = useState(s.docs);
  const [consent, setConsent] = useState(s.guardian.consentToTravel);

  const emailBad = email.trim().length > 0 && !email.includes('@');

  return (
    <div className="editor editor--flush">
      <div className="editor__grid">
        <label className="editor__f">
          <span className="label">Guardian phone</span>
          <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="editor__f">
          <span className="label">Guardian email</span>
          <input
            className="field"
            value={email}
            aria-invalid={emailBad}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {(Object.keys(docs) as (keyof typeof docs)[]).map((k) => (
          <label key={k} className="editor__f">
            <span className="label">{DOC_NAMES[k]}</span>
            <select
              className="field"
              value={docs[k]}
              onChange={(e) => setDocs({ ...docs, [k]: e.target.value as DocState })}
            >
              <option value="in">In</option>
              <option value="outstanding">Outstanding</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
        ))}
        <label className="editor__f">
          <span className="label">Dietary</span>
          <input
            className="field"
            value={dietary}
            placeholder="None recorded"
            onChange={(e) => setDietary(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">Medical</span>
          <input
            className="field"
            value={medical}
            placeholder="None recorded"
            onChange={(e) => setMedical(e.target.value)}
          />
        </label>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>Written consent to travel off site is on file</span>
      </label>

      {emailBad && (
        <p className="mark mark--critical" style={{ marginTop: 12 }}>
          That is not an email address. A chase sent to it will not arrive.
        </p>
      )}

      <div className="editor__actions">
        <button
          className="btn btn--primary"
          disabled={emailBad}
          onClick={() => {
            saveStudent({
              ...s,
              docs,
              dietary: dietary.trim() || null,
              medical: medical.trim() || null,
              guardian: {
                ...s.guardian,
                phone,
                email: email.trim(),
                consentToTravel: consent,
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
          Every change is written to the audit trail.
        </span>
      </div>
    </div>
  );
}

export function StudentProfile({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const {
    students, sessions, reminders, payments, incidents, audit, role,
  } = useStore();
  const [tab, setTab] = useState<Tab>('record');
  const [editing, setEditing] = useState(false);

  const s = students.find((x) => x.id === id);
  const mine = useMemo(
    () =>
      s ? sessions.filter((x) => x.groupId === s.groupId && x.status !== 'cancelled') : [],
    [s, sessions],
  );

  if (!s) return null;

  const g = s.guardian;
  const room = roomById(s.roomId);
  const warden = room ? wardenFor(room) : null;
  const mates = s.roomId ? occupants(s.roomId).filter((o) => o.id !== s.id) : [];
  const r = readiness(s);
  const outstanding = owed(s);
  const theirs = reminders.filter(
    (x) => !x.done && x.title.startsWith(`${s.forename} ${s.surname}`),
  );
  const paid = payments.filter((p) => p.studentId === s.id);
  const involved = incidents.filter((i) => i.studentIds.includes(s.id));
  const trail = audit.filter((a) => a.subject.includes(`${s.forename} ${s.surname}`));

  const days = Array.from(new Set(mine.map((x) => x.day))).sort();

  /* Money is finance. A role with no finance section does not get a money tab
     on a student record either — the same rule, enforced in both places. */
  const seesMoney = role.sections.includes('finance');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'record', label: 'Record' },
    { id: 'stay', label: 'Stay and room' },
    { id: 'guardian', label: 'Guardian' },
    { id: 'week', label: 'Their week' },
    ...(seesMoney
      ? [{ id: 'money' as Tab, label: `Money${outstanding > 0 ? ' ·' : ''}` }]
      : []),
    { id: 'history', label: `History ${involved.length + trail.length}` },
  ];

  return (
    <Drawer
      title={`${s.forename} ${s.surname}`}
      sub={
        <>
          {s.age} · {s.band} · {groupById(s.groupId).name} · {s.country}
          {isOnSite(s) ? ' · on site' : ' · not yet arrived'}
        </>
      }
      tag={
        r.ready ? (
          <span className="mark mark--clear">Admissible</span>
        ) : (
          <span className="mark mark--critical">Cannot be admitted</span>
        )
      }
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
        <Editor s={s} onDone={() => setEditing(false)} />
      )}

      {tab === 'record' && (
        <>
          {!r.ready && (
            <div className="alert alert--critical">
              <p className="label">Blocking admission</p>
              <ul className="log">
                {r.blocking.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {r.watch.length > 0 && (
            <div className="alert">
              <p className="label">Watch, not a block</p>
              <ul className="log">
                {r.watch.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="label">Documents</p>
          <dl className="pairs">
            {(Object.entries(s.docs) as [string, DocState][]).map(([k, v]) => (
              <div className="pairs__pair" key={k}>
                <dt>{DOC_NAMES[k]}</dt>
                <dd>
                  <span className={`mark ${DOC_COPY[v].mark}`}>{DOC_COPY[v].label}</span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="label">Welfare</p>
          {role.welfareDetail ? (
            <dl className="pairs">
              <div className="pairs__pair">
                <dt>Dietary</dt>
                <dd>{s.dietary ?? 'None recorded'}</dd>
              </div>
              <div className="pairs__pair">
                <dt>Medical</dt>
                <dd>{s.medical ?? 'None recorded'}</dd>
              </div>
              <div className="pairs__pair">
                <dt>Off-site travel</dt>
                <dd>
                  {g.consentToTravel ? (
                    <span className="mark mark--clear">Consented</span>
                  ) : (
                    <span className="mark mark--critical">No consent on file</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="meta">
              Dietary and medical notes are special category data.{' '}
              {role.name} does not see them — ask the welfare officer if you
              need to know for a session.
            </p>
          )}

          {theirs.length > 0 && (
            <>
              <p className="label">Outstanding against this student</p>
              <ul className="log">
                {theirs.map((x) => (
                  <li key={x.id}>
                    {x.title}
                    <span className="meta"> · {x.source}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {tab === 'stay' && (
        <>
          <p className="label">Stay</p>
          <dl className="pairs">
            <div className="pairs__pair"><dt>Arrives</dt><dd>{fmtDateLong(s.arrival)}</dd></div>
            <div className="pairs__pair"><dt>Leaves</dt><dd>{fmtDateLong(s.leaving)}</dd></div>
            <div className="pairs__pair"><dt>Nights</dt><dd>{nights(s)}</dd></div>
            <div className="pairs__pair"><dt>Date of birth</dt><dd>{fmtDateLong(s.dob)}</dd></div>
            <div className="pairs__pair"><dt>Group</dt><dd>{groupById(s.groupId).name} · {s.band}</dd></div>
          </dl>

          <p className="label">Residence</p>
          <dl className="pairs">
            <div className="pairs__pair">
              <dt>Room</dt>
              <dd>
                {s.roomId ? roomLabel(s.roomId) : (
                  <span className="mark mark--critical">Not allocated</span>
                )}
              </dd>
            </div>
            <div className="pairs__pair"><dt>Floor</dt><dd>{room ? room.floor : '—'}</dd></div>
            <div className="pairs__pair"><dt>Bed</dt><dd>{s.bed || '—'}</dd></div>
            <div className="pairs__pair">
              <dt>Floor warden</dt>
              <dd>{warden ? `${warden.forename} ${warden.surname}` : 'Not assigned'}</dd>
            </div>
            <div className="pairs__pair">
              <dt>Sharing with</dt>
              <dd>
                {mates.length
                  ? mates.map((m) => `${m.forename} ${m.surname}`).join(', ')
                  : 'Sole occupant'}
              </dd>
            </div>
          </dl>
        </>
      )}

      {tab === 'guardian' && (
        <>
          <p className="label">Parent or guardian</p>
          <dl className="pairs">
            <div className="pairs__pair">
              <dt>Name</dt>
              <dd>{g.name}<span className="meta"> · {g.relationship}</span></dd>
            </div>
            <div className="pairs__pair"><dt>Phone</dt><dd>{g.phone}</dd></div>
            <div className="pairs__pair"><dt>Alternate</dt><dd>{g.altPhone}</dd></div>
            <div className="pairs__pair"><dt>Email</dt><dd className="pairs__wrap">{g.email}</dd></div>
            <div className="pairs__pair"><dt>Address</dt><dd className="pairs__wrap">{g.address}</dd></div>
            <div className="pairs__pair">
              <dt>Language</dt>
              <dd>
                {g.language}
                {g.language !== 'English' && (
                  <span className="meta"> · write chases in plain English</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="label">Emergency contact</p>
          <dl className="pairs">
            <div className="pairs__pair"><dt>Name</dt><dd>{g.emergencyName}</dd></div>
            <div className="pairs__pair"><dt>Phone</dt><dd>{g.emergencyPhone}</dd></div>
          </dl>
        </>
      )}

      {tab === 'week' && (
        <>
          <p className="meta" style={{ margin: '0 0 16px' }}>
            {s.forename} is in {groupById(s.groupId).name}, so this is the
            group&rsquo;s rota — where {s.forename} is, hour by hour, and who is
            with them.
          </p>
          {days.length === 0 ? (
            <p className="meta">No sessions on the rota for this group.</p>
          ) : (
            <div className="tablewrap">
              <table className="sched__grid">
                <thead>
                  <tr>
                    <th />
                    {days.map((d) => (
                      <th key={d} scope="col">
                        <span className="sched__day">{dayName(d)}</span>
                        <span className="meta sched__dayh">{fmtDate(d)}</span>
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
                      {days.map((d) => {
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
                                  {on.staffIds
                                    .map((sid) => staffById(sid)?.forename)
                                    .filter(Boolean)
                                    .join(', ') || 'No staff assigned'}
                                </span>
                              </span>
                            ) : (
                              <span className="shift shift--off" aria-label="Free" />
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
        </>
      )}

      {tab === 'money' && seesMoney && (
        <>
          <p className="label">Invoice</p>
          <dl className="pairs">
            <div className="pairs__pair"><dt>Reference</dt><dd className="num">{invoiceRef(s)}</dd></div>
            <div className="pairs__pair"><dt>Invoiced</dt><dd className="num">{fmtMoney(s.balancePence)}</dd></div>
            <div className="pairs__pair"><dt>Received</dt><dd className="num">{fmtMoney(s.paidPence)}</dd></div>
            <div className="pairs__pair">
              <dt>Outstanding</dt>
              <dd>
                {outstanding > 0 ? (
                  <span className="mark mark--overdue">{fmtMoney(outstanding)}</span>
                ) : (
                  <span className="mark mark--clear">Paid in full</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="label">Payments received</p>
          {paid.length === 0 ? (
            <p className="meta">Nothing received against this invoice yet.</p>
          ) : (
            <ul className="log">
              {paid.map((p) => (
                <li key={p.id}>
                  <span className="num">{fmtMoney(p.amountPence)}</span> ·{' '}
                  {fmtDate(p.at)} · {p.method} · {p.payer}
                  <span className="meta">
                    {' '}
                    · {p.auto ? 'matched by reference' : 'matched by hand'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <p className="label">Incidents</p>
          {involved.length === 0 ? (
            <p className="meta">Nothing recorded against {s.forename}.</p>
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
            <p className="meta">No entries name this student yet.</p>
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
