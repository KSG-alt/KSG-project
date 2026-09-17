import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { useStore } from '../lib/store';
import { IconCheck, IconClose, IconSend } from '../lib/icons';
import {
  DOC_LABEL, STATE_COPY, accepted, linkFor, neverOpened, waitingOnThem,
  waitingOnUs, type DocRequest,
} from '../data/portal';
import { fmtDate, fmtDateLong } from '../data/seed';

/* Three piles, and only three: the ones that need chasing, the ones the
   centre can clear today, and the evidence of what came in. An "everything"
   tab is a pile nobody is working from. */
type View = 'them' | 'us' | 'accepted';

export function Portal() {
  const {
    students, requests, sendRequest, acceptRequest, rejectRequest, remindRequest,
    role,
  } = useStore();
  const [view, setView] = useState<View>('us');
  const [q, setQ] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const named = (id: string) => students.find((s) => s.id === id);

  const rows = useMemo(() => {
    const base =
      view === 'us'
        ? waitingOnUs(requests)
        : view === 'them'
          ? waitingOnThem(requests)
          : accepted(requests);
    return base.filter((r) => {
      if (!q) return true;
      const s = named(r.studentId);
      return `${s?.forename} ${s?.surname} ${DOC_LABEL[r.kind]} ${s?.guardian.name}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [requests, view, q, students]);

  const notSent = requests.filter((r) => r.state === 'not-sent').length;
  const stale = requests.filter((r) => r.state === 'sent' && r.reminders >= 2).length;

  const tabs: { id: View; label: string }[] = [
    { id: 'them', label: `Waiting on them ${waitingOnThem(requests).length}` },
    { id: 'us', label: `Waiting for verification ${waitingOnUs(requests).length}` },
    { id: 'accepted', label: `Accepted ${accepted(requests).length}` },
  ];

  return (
    <>
      <SectionHead
        title="Document portal"
        count={`${waitingOnThem(requests).length} outstanding · ${waitingOnUs(requests).length} to verify · ${accepted(requests).length} accepted · ${neverOpened(requests).length} never opened`}
      >
        <input
          className="field"
          style={{ width: 220 }}
          placeholder="Search student, document, guardian"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search requests"
        />
      </SectionHead>

      <p className="meta section__lede">
        Every chase needs somewhere for the answer to go. One link per document
        per student, in three piles that match how the work divides:{' '}
        <strong>waiting on them</strong> needs chasing,{' '}
        <strong>waiting for verification</strong> is what a parent has sent and
        nobody has checked — the pile an admin clears this morning — and{' '}
        <strong>accepted</strong> is the evidence: what came in, who checked it
        and when. Sent but never opened is a different problem from opened and
        ignored, so it is counted separately.
      </p>

      <div className="alert">
        <p className="label">No link is sent and no file is stored</p>
        <p className="meta" style={{ margin: 0 }}>
          A working portal needs a service that holds the token, receives the
          file and scans it. That does not exist yet, so the states, the chase
          counting and the audit trail here are real, and the sending is not.
          Nothing in this demonstration reaches a parent.
        </p>
      </div>

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}

      <div className="tabs" role="tablist" aria-label="Portal view">
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

      {view !== 'accepted' && notSent > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {notSent} documents have never been asked for at all
        </p>
      )}
      {view !== 'accepted' && stale > 0 && (
        <p className="mark mark--overdue" style={{ marginBottom: 22 }}>
          {stale} links chased twice and never opened — the address is probably
          wrong. Check it before chasing a third time.
        </p>
      )}

      {(
        rows.length === 0 ? (
          <p className="meta reminders__empty">Nothing in this pile.</p>
        ) : (
          <ul className="reqs stagger">
            {rows.slice(0, 60).map((r) => {
              const s = named(r.studentId);
              const st = STATE_COPY[r.state];
              if (!s) return null;
              return (
                <li key={r.id} className="req">
                  <div className="req__head">
                    <span className={`mark ${st.mark}`}>{st.label}</span>
                    <button className="namebtn req__who" onClick={() => setOpenStudent(s.id)}>
                      {s.forename} {s.surname}
                    </button>
                    <span className="req__what">{DOC_LABEL[r.kind]}</span>
                    <span className="meta req__when">
                      {r.state === 'not-sent'
                        ? 'never sent'
                        : r.uploadedAt
                        ? `uploaded ${fmtDate(r.uploadedAt)}`
                        : r.openedAt
                        ? `opened ${fmtDate(r.openedAt)}`
                        : `sent ${fmtDate(r.sentAt!)}`}
                      {r.reminders > 0 && ` · chased ${r.reminders}×`}
                    </span>
                  </div>

                  <p className="meta req__next">{st.next}</p>

                  {r.reason && (
                    <p className="meta req__reason">Told them: {r.reason}</p>
                  )}

                  <div className="req__actions">
                    {r.state === 'accepted' && (
                      <>
                        <span className="meta req__file">{r.filename}</span>
                        <span className="meta">
                          checked in{r.decidedAt ? ` ${fmtDate(r.decidedAt)}` : ''} ·
                          marked on the student record
                        </span>
                      </>
                    )}

                    {r.state === 'uploaded' && (
                      <>
                        <span className="meta req__file">{r.filename}</span>
                        <button
                          className="btn btn--primary"
                          disabled={!role.canEditRecords}
                          onClick={() => acceptRequest(r.id)}
                        >
                          <IconCheck />
                          Accept
                        </button>
                        {rejecting === r.id ? (
                          <span className="req__reject">
                            <input
                              className="field"
                              placeholder="Why, in words they can act on"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                            <button
                              className="btn btn--danger"
                              disabled={reason.trim().length < 8}
                              onClick={() => {
                                rejectRequest(r.id, reason.trim());
                                setRejecting(null);
                                setReason('');
                              }}
                            >
                              Send it back
                            </button>
                            <button className="btn" onClick={() => setRejecting(null)}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            className="btn"
                            disabled={!role.canEditRecords}
                            onClick={() => setRejecting(r.id)}
                          >
                            <IconClose />
                            Send it back
                          </button>
                        )}
                      </>
                    )}

                    {r.state === 'not-sent' && (
                      <button
                        className="btn btn--primary"
                        disabled={!role.canEditRecords}
                        onClick={() => sendRequest(r.id)}
                      >
                        <IconSend />
                        Send the link
                      </button>
                    )}

                    {(r.state === 'sent' || r.state === 'opened' || r.state === 'rejected') && (
                      <button
                        className="btn"
                        disabled={!role.canEditRecords}
                        onClick={() => remindRequest(r.id)}
                      >
                        <IconSend />
                        Remind them
                      </button>
                    )}

                    <span className="meta req__link num">{linkFor(r)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      {rows.length > 60 && (
        <p className="meta" style={{ marginTop: 18 }}>
          Showing 60 of {rows.length}. Narrow with search.
        </p>
      )}
    </>
  );
}
