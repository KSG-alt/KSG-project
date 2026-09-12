import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { IconCheck, IconClose } from '../lib/icons';
import { useStore } from '../lib/store';
import { invoiceRef, owed, suggestMatches, type Payment } from '../data/finance';
import { fmtDate, fmtDateLong, fmtMoney, groupById } from '../data/seed';

type View = 'unmatched' | 'owing' | 'received';

function Match({ p, onOpenStudent }: { p: Payment; onOpenStudent: (id: string) => void }) {
  const { students, matchPayment } = useStore();
  const [picked, setPicked] = useState<string | null>(null);
  const candidates = useMemo(() => suggestMatches(p, students), [p, students]);

  return (
    <div className="match">
      <div className="match__head">
        <div>
          <p className="match__amount num">{fmtMoney(p.amountPence)}</p>
          <p className="meta match__from">
            {p.payer} · {p.method} · {fmtDateLong(p.at)}
          </p>
        </div>
        <span className={`mark ${p.reference ? 'mark--idle' : 'mark--overdue'}`}>
          {p.reference ? `Reference “${p.reference}”` : 'No reference'}
        </span>
      </div>

      {candidates.length === 0 ? (
        <p className="meta">
          Nothing on the roll owes this amount and no name matches. This one
          needs the bank statement and a phone call, not a suggestion.
        </p>
      ) : (
        <>
          <p className="label">Best guesses</p>
          <ul className="match__list">
            {candidates.map((c) => (
              <li key={c.student.id}>
                <label className="match__opt">
                  <input
                    type="radio"
                    name={`match-${p.id}`}
                    checked={picked === c.student.id}
                    onChange={() => setPicked(c.student.id)}
                  />
                  <span className="match__who">
                    <span className="match__name">
                      {c.student.forename} {c.student.surname}
                    </span>
                    <span className="meta">
                      {invoiceRef(c.student)} · {groupById(c.student.groupId).name} ·{' '}
                      owes {fmtMoney(owed(c.student))}
                    </span>
                    <span className="meta match__why">{c.why.join(', ')}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenStudent(c.student.id);
                    }}
                  >
                    Open record
                  </button>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="match__actions">
        <button
          className="btn btn--primary"
          disabled={!picked}
          onClick={() => picked && matchPayment(p.id, picked)}
        >
          <IconCheck />
          Match to this student
        </button>
        <span className="meta">
          Matching reduces that student&rsquo;s balance and writes the decision,
          with your name on it, to the audit trail.
        </span>
      </div>
    </div>
  );
}

export function Finance() {
  const { payments, students, unmatchPayment } = useStore();
  const [view, setView] = useState<View>('unmatched');
  const [q, setQ] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const unmatched = payments.filter((p) => !p.studentId);
  const matched = payments.filter((p) => p.studentId);
  const owing = students
    .filter((s) => owed(s) > 0)
    .sort((a, b) => owed(b) - owed(a));

  const banked = matched.reduce((n, p) => n + p.amountPence, 0);
  const held = unmatched.reduce((n, p) => n + p.amountPence, 0);
  const outstanding = owing.reduce((n, s) => n + owed(s), 0);

  const hit = (text: string) => !q || text.toLowerCase().includes(q.toLowerCase());

  const tabs: { id: View; label: string }[] = [
    { id: 'unmatched', label: `Needs a decision ${unmatched.length}` },
    { id: 'owing', label: `Outstanding ${owing.length}` },
    { id: 'received', label: `Received ${matched.length}` },
  ];

  return (
    <>
      <SectionHead
        title="Payments"
        count={`${fmtMoney(banked)} matched · ${fmtMoney(held)} unmatched · ${fmtMoney(outstanding)} outstanding`}
      >
        <input
          className="field"
          style={{ width: 220 }}
          placeholder="Search payer, student, reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search payments"
        />
      </SectionHead>

      <p className="meta section__lede">
        A balance on a record is not reconciliation. Reconciliation is deciding
        which line on the statement is which student, when the payer is a parent
        with a different surname and the reference is blank. The platform
        suggests; a person decides, and the decision is signed.
      </p>

      <div className="tabs" role="tablist" aria-label="Payment view">
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

      {view === 'unmatched' && (
        unmatched.length === 0 ? (
          <p className="meta reminders__empty">
            Every payment received is matched to a student.
          </p>
        ) : (
          <div className="matches stagger">
            {unmatched
              .filter((p) => hit(`${p.payer} ${p.reference}`))
              .map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                  <Match p={p} onOpenStudent={setOpenStudent} />
                </div>
              ))}
          </div>
        )
      )}

      {view === 'owing' && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th style={{ width: '24%' }}>Student</th>
                <th>Invoice</th>
                <th>Group</th>
                <th>Invoiced</th>
                <th>Received</th>
                <th>Outstanding</th>
                <th>Arrives</th>
                <th />
              </tr>
            </thead>
            <tbody className="stagger">
              {owing
                .filter((s) => hit(`${s.forename} ${s.surname} ${invoiceRef(s)}`))
                .slice(0, 60)
                .map((s, i) => (
                  <tr key={s.id} style={{ animationDelay: `${Math.min(i * 12, 240)}ms` }}>
                    <td>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.guardian.name} · {s.guardian.phone}
                      </span>
                    </td>
                    <td className="num meta">{invoiceRef(s)}</td>
                    <td>{groupById(s.groupId).name}</td>
                    <td className="num">{fmtMoney(s.balancePence)}</td>
                    <td className="num">{fmtMoney(s.paidPence)}</td>
                    <td>
                      <span className="mark mark--overdue">{fmtMoney(owed(s))}</span>
                    </td>
                    <td className="num">{fmtDate(s.arrival)}</td>
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

      {view === 'received' && (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th>Received</th>
                <th>Amount</th>
                <th style={{ width: '20%' }}>Payer</th>
                <th>Method</th>
                <th>Reference</th>
                <th style={{ width: '20%' }}>Matched to</th>
                <th>How</th>
                <th />
              </tr>
            </thead>
            <tbody className="stagger">
              {matched
                .filter((p) => {
                  const s = students.find((x) => x.id === p.studentId);
                  return hit(`${p.payer} ${p.reference} ${s ? `${s.forename} ${s.surname}` : ''}`);
                })
                .slice(0, 60)
                .map((p, i) => {
                  const s = students.find((x) => x.id === p.studentId);
                  return (
                    <tr key={p.id} style={{ animationDelay: `${Math.min(i * 10, 220)}ms` }}>
                      <td className="num">{fmtDate(p.at)}</td>
                      <td className="num">{fmtMoney(p.amountPence)}</td>
                      <td>{p.payer}</td>
                      <td className="meta">{p.method}</td>
                      <td className="num meta">{p.reference || '—'}</td>
                      <td>
                        {s ? (
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`mark ${p.auto ? 'mark--clear' : 'mark--idle'}`}>
                          {p.auto ? 'By reference' : 'By hand'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!p.auto && (
                          <button
                            className="btn btn--quiet"
                            onClick={() => unmatchPayment(p.id)}
                            title="Put this payment back in the unmatched queue"
                          >
                            <IconClose />
                            Undo match
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
