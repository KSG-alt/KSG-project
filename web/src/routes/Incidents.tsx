import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { IconCheck, IconClose } from '../lib/icons';
import { useStore } from '../lib/store';
import {
  INCIDENT_KINDS, LEVEL_COPY, minutesToDsl, sinceLabel, type Incident,
  type IncidentKind, type IncidentLevel,
} from '../data/incidents';
import { DEMO_TODAY, demoStamp, isOnSite } from '../data/seed';
import { Lede } from '../components/Lede';

type View = 'open' | 'all' | 'notifiable';

function Raise({ onDone }: { onDone: () => void }) {
  const { addIncident, students, staff } = useStore();
  const [kind, setKind] = useState<IncidentKind>('Injury');
  const [level, setLevel] = useState<IncidentLevel>('logged');
  const [where, setWhere] = useState('');
  const [what, setWhat] = useState('');
  const [action, setAction] = useState('');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');

  const onSite = students.filter((s) => isOnSite(s));
  const incomplete = !where.trim() || what.trim().length < 12 || !action.trim();

  return (
    <div className="raise">
      <p className="label">Record an incident</p>
      <p className="meta" style={{ margin: '0 0 18px', maxWidth: '66ch' }}>
        Write what happened in the words used at the time. Do not tidy it, do
        not interpret it, and do not leave it until later — the time this is
        written is part of the record.
      </p>

      <div className="editor__grid">
        <label className="editor__f">
          <span className="label">What kind</span>
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)}>
            {INCIDENT_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="editor__f">
          <span className="label">Level</span>
          <select className="field" value={level} onChange={(e) => setLevel(e.target.value as IncidentLevel)}>
            <option value="logged">Logged — recorded, no further action expected</option>
            <option value="significant">Significant — the safeguarding lead decides</option>
            <option value="notifiable">Notifiable — needs a referral decision</option>
          </select>
        </label>
        <label className="editor__f">
          <span className="label">Where</span>
          <input
            className="field"
            value={where}
            placeholder="Lower field"
            onChange={(e) => setWhere(e.target.value)}
          />
        </label>
        <label className="editor__f">
          <span className="label">Student involved</span>
          <select className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Nobody named</option>
            {onSite.slice(0, 80).map((s) => (
              <option key={s.id} value={s.id}>
                {s.forename} {s.surname}
              </option>
            ))}
          </select>
        </label>
        <label className="editor__f">
          <span className="label">Staff present</span>
          <select className="field" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Nobody named</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.forename} {s.surname} · {s.role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task__f">
        <span className="label">What happened</span>
        <textarea
          className="field"
          rows={3}
          value={what}
          placeholder="In the words used at the time."
          onChange={(e) => setWhat(e.target.value)}
        />
      </label>

      <label className="task__f">
        <span className="label">What was done about it</span>
        <textarea
          className="field"
          rows={2}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
      </label>

      <p className={`mark ${LEVEL_COPY[level].mark}`} style={{ marginTop: 4 }}>
        {LEVEL_COPY[level].note}
      </p>

      {incomplete && (
        <p className="meta" style={{ color: 'var(--ink-3)', marginTop: 10 }}>
          A record needs a place, a description of at least a sentence, and what
          was done.
        </p>
      )}

      <div className="editor__actions">
        <button
          className="btn btn--primary"
          disabled={incomplete}
          onClick={() => {
            const inc: Incident = {
              id: `inc-${Math.random().toString(36).slice(2, 7)}`,
              at: demoStamp(),
              kind,
              level,
              studentIds: studentId ? [studentId] : [],
              staffIds: staffId ? [staffId] : [],
              where: where.trim(),
              what: what.trim(),
              action: action.trim(),
              reportedBy: 'Ismail',
              dslInformedAt: null,
              parentsInformedAt: null,
              status: 'open',
              followUp: level === 'notifiable'
                ? 'Referral decision owed by the safeguarding lead.'
                : null,
            };
            addIncident(inc);
            onDone();
          }}
        >
          <IconCheck />
          Record it
        </button>
        <button className="btn" onClick={onDone}>
          <IconClose />
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({
  i,
  onStudent,
  onStaff,
}: {
  i: Incident;
  onStudent: (id: string) => void;
  onStaff: (id: string) => void;
}) {
  const { students, staff, closeIncident, informDsl, informParents } = useStore();
  const [open, setOpen] = useState(false);
  const level = LEVEL_COPY[i.level];
  const mins = minutesToDsl(i);

  return (
    <li className={`inc${i.status === 'closed' ? ' inc--closed' : ''}`}>
      <button className="inc__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`mark ${level.mark}`}>{level.label}</span>
        <span className="inc__kind">{i.kind}</span>
        <span className="inc__what">{i.what}</span>
        <span className="meta inc__when">
          {i.at.replace('T', ' ')} · {i.where}
        </span>
        <span className={`mark ${i.status === 'open' ? 'mark--overdue' : 'mark--clear'} inc__state`}>
          {i.status === 'open' ? 'Open' : 'Closed'}
        </span>
      </button>

      {open && (
        <div className="inc__detail">
          <div className="inc__cols">
            <section>
              <p className="label">What was done</p>
              <p className="meta">{i.action}</p>
              {i.followUp && (
                <>
                  <p className="label">Follow-up</p>
                  <p className="meta">{i.followUp}</p>
                </>
              )}
            </section>

            <section>
              <p className="label">Who</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Reported by</dt>
                  <dd>{i.reportedBy}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Students</dt>
                  <dd>
                    {i.studentIds.length === 0
                      ? 'Nobody named'
                      : i.studentIds.map((id, n) => {
                          const s = students.find((x) => x.id === id);
                          return s ? (
                            <span key={id}>
                              {n > 0 && ', '}
                              <button className="namebtn" onClick={() => onStudent(id)}>
                                {s.forename} {s.surname}
                              </button>
                            </span>
                          ) : null;
                        })}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Staff</dt>
                  <dd>
                    {i.staffIds.length === 0
                      ? 'Nobody named'
                      : i.staffIds.map((id, n) => {
                          const s = staff.find((x) => x.id === id);
                          return s ? (
                            <span key={id}>
                              {n > 0 && ', '}
                              <button className="namebtn" onClick={() => onStaff(id)}>
                                {s.forename} {s.surname}
                              </button>
                            </span>
                          ) : null;
                        })}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <p className="label">Who was told, and when</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Safeguarding lead</dt>
                  <dd>
                    {i.dslInformedAt ? (
                      <>
                        <span className="mark mark--clear">Told</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {i.dslInformedAt.replace('T', ' ')}
                          {mins !== null ? ` · ${sinceLabel(mins)} after` : ''}
                        </span>
                      </>
                    ) : i.level === 'logged' ? (
                      <span className="meta">Not required at this level</span>
                    ) : (
                      <span className="mark mark--critical">Not told</span>
                    )}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Parents</dt>
                  <dd>
                    {i.parentsInformedAt ? (
                      <>
                        <span className="mark mark--clear">Told</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {i.parentsInformedAt.replace('T', ' ')}
                        </span>
                      </>
                    ) : i.level === 'notifiable' ? (
                      <span className="meta">
                        Held until the referral decision is made
                      </span>
                    ) : (
                      <span className="mark mark--overdue">Not told</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="inc__actions">
            {!i.dslInformedAt && i.level !== 'logged' && (
              <button className="btn btn--primary" onClick={() => informDsl(i.id)}>
                Safeguarding lead told
              </button>
            )}
            {!i.parentsInformedAt && i.level !== 'notifiable' && (
              <button className="btn" onClick={() => informParents(i.id)}>
                Parents told
              </button>
            )}
            {i.status === 'open' && (
              <button
                className="btn"
                disabled={i.level !== 'logged' && !i.dslInformedAt}
                onClick={() => closeIncident(i.id)}
                title={
                  i.level !== 'logged' && !i.dslInformedAt
                    ? 'The safeguarding lead has to be told before this can be closed'
                    : undefined
                }
              >
                <IconCheck />
                Close
              </button>
            )}
            <span className="meta">
              Every one of these writes a line to the safeguarding audit trail.
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

export function Incidents() {
  const { incidents } = useStore();
  const [view, setView] = useState<View>('open');
  const [raising, setRaising] = useState(false);
  const [student, setStudent] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  const open = incidents.filter((i) => i.status === 'open');
  const notifiable = incidents.filter((i) => i.level === 'notifiable');
  const untold = incidents.filter(
    (i) => i.level !== 'logged' && !i.dslInformedAt,
  );

  const rows =
    view === 'open' ? open : view === 'notifiable' ? notifiable : incidents;

  const tabs: { id: View; label: string }[] = [
    { id: 'open', label: `Open ${open.length}` },
    { id: 'notifiable', label: `Notifiable ${notifiable.length}` },
    { id: 'all', label: `Everything ${incidents.length}` },
  ];

  return (
    <>
      <SectionHead
        title="Incidents"
        count={`${open.length} open · ${notifiable.length} notifiable · ${incidents.length} this season`}
      >
        <button
          className={`btn${raising ? '' : ' btn--primary'}`}
          onClick={() => setRaising((v) => !v)}
        >
          {raising ? 'Cancel' : 'Record an incident'}
        </button>
      </SectionHead>

      <Lede>
        The question asked afterwards is never &ldquo;was it written down&rdquo;.
        It is how long it took to tell the safeguarding lead, and who decided
        what happened next. So that is what this screen measures. Today is{' '}
        {DEMO_TODAY.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </Lede>

      {untold.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 20 }}>
          {untold.length} incident{untold.length === 1 ? '' : 's'} above the
          logging threshold with no record of the safeguarding lead being told
        </p>
      )}

      {raising && <Raise onDone={() => setRaising(false)} />}

      <div className="tabs" role="tablist" aria-label="Incident view">
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

      {student && <StudentProfile id={student} onClose={() => setStudent(null)} />}
      {staffId && <StaffProfile id={staffId} onClose={() => setStaffId(null)} />}

      {rows.length === 0 ? (
        <p className="meta reminders__empty">Nothing in this view.</p>
      ) : (
        <ul className="incs stagger">
          {rows.map((i) => (
            <Row key={i.id} i={i} onStudent={setStudent} onStaff={setStaffId} />
          ))}
        </ul>
      )}
    </>
  );
}
