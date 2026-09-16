import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { useStore } from '../lib/store';
import { IconCheck, IconClose, IconSend } from '../lib/icons';
import {
  DOC_LABEL, DOC_WHY, STATE_COPY, linkFor, waitingOnThem, waitingOnUs,
  type DocRequest,
} from '../data/portal';
import { fmtDate, fmtDateLong } from '../data/seed';

type View = 'us' | 'them' | 'all' | 'preview';

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
      view === 'us' ? waitingOnUs(requests)
      : view === 'them' ? waitingOnThem(requests)
      : requests;
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
    { id: 'us', label: `Waiting on us ${waitingOnUs(requests).length}` },
    { id: 'them', label: `Waiting on them ${waitingOnThem(requests).length}` },
    { id: 'all', label: `Everything ${requests.length}` },
    { id: 'preview', label: 'What a parent sees' },
  ];

  const sample = requests.find((r) => r.state === 'sent') ?? requests[0];

  return (
    <>
      <SectionHead
        title="Document portal"
        count={`${waitingOnUs(requests).length} to check · ${waitingOnThem(requests).length} outstanding · ${requests.filter((r) => r.state === 'accepted').length} accepted`}
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
        per student, and the states split the work the way it actually divides:{' '}
        <strong>waiting on us</strong> is a pile an admin can clear this
        morning, <strong>waiting on them</strong> is a pile that needs chasing,
        and &ldquo;sent but never opened&rdquo; is a different problem from
        &ldquo;opened and ignored&rdquo;.
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

      {view !== 'preview' && notSent > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {notSent} documents have never been asked for at all
        </p>
      )}
      {view !== 'preview' && stale > 0 && (
        <p className="mark mark--overdue" style={{ marginBottom: 22 }}>
          {stale} links chased twice and never opened — the address is probably
          wrong. Check it before chasing a third time.
        </p>
      )}

      {view === 'preview' && sample && <ParentView req={sample} />}

      {view !== 'preview' && (
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

      {view !== 'preview' && rows.length > 60 && (
        <p className="meta" style={{ marginTop: 18 }}>
          Showing 60 of {rows.length}. Narrow with search.
        </p>
      )}
    </>
  );
}

/* What the parent would get. Shown here so the copy can be argued about — a
   parent who does not read English first has to be able to act on it. */
function ParentView({ req }: { req: DocRequest }) {
  const { students } = useStore();
  const s = students.find((x) => x.id === req.studentId);
  if (!s) return null;

  return (
    <>
      <p className="meta section__lede">
        The page behind the link, as {s.guardian.name} would see it. It is a
        mock-up inside this dashboard, not a live page — but the words are the
        real thing to argue about, because a parent who does not read English
        first has to be able to act on them.
      </p>

      <div className="parent">
        <div className="parent__chrome">
          <span className="num">{linkFor(req)}</span>
        </div>
        <div className="parent__page">
          <p className="parent__from">Ashcombe Park summer school</p>
          <h2 className="parent__title">
            {DOC_LABEL[req.kind]} for {s.forename}
          </h2>
          <p className="parent__lede">{DOC_WHY[req.kind]}</p>

          <dl className="pairs parent__facts">
            <div className="pairs__pair">
              <dt>Student</dt>
              <dd>{s.forename} {s.surname}</dd>
            </div>
            <div className="pairs__pair">
              <dt>Arrives</dt>
              <dd>{fmtDateLong(s.arrival)}</dd>
            </div>
            <div className="pairs__pair">
              <dt>Needed by</dt>
              <dd>{fmtDateLong(s.arrival)} — before they travel</dd>
            </div>
          </dl>

          <div className="parent__drop">
            <p className="parent__droptitle">Take a photo or choose a file</p>
            <p className="meta">
              A clear photo of every page is fine. PDF, JPG or PNG, up to 10 MB.
            </p>
            <button className="btn btn--primary" disabled>
              Choose a file
            </button>
          </div>

          <p className="meta parent__foot">
            Any problem, reply to the message this link came in, or call the
            centre on 020 7946 0000. We will not ask you for payment details on
            this page, ever.
          </p>
        </div>
      </div>

      <p className="meta" style={{ marginTop: 18, color: 'var(--ink-3)', maxWidth: '66ch' }}>
        Three things this page does on purpose: it says why the document is
        needed rather than just demanding it, it names the date it is needed by
        against the student&rsquo;s own arrival, and it states that payment is
        never asked for here — because the moment a centre sends parents links,
        somebody else starts sending them fake ones.
      </p>
    </>
  );
}
