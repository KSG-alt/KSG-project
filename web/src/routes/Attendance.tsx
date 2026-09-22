import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { OPERATOR_ID, useStore } from '../lib/store';
import { IconCheck } from '../lib/icons';
import {
  MARK_COPY, absentees, counted, hasRun, registerFor, rollFor, unclosed,
  type Mark, type Register,
} from '../data/attendance';
import {
  DEMO_TODAY, activityById, fmtDateLong, groupById, type Session,
} from '../data/seed';
import { Lede } from '../components/Lede';

type View = 'today' | 'gaps' | 'absent' | 'devices';

const TODAY = `${DEMO_TODAY.getFullYear()}-${String(DEMO_TODAY.getMonth() + 1).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;


export function Attendance() {
  const {
    sessions, students, staff, registers, takeRegister, closeRegister, markOne,
    role,
  } = useStore();
  const [view, setView] = useState<View>('today');
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const today = useMemo(
    () =>
      sessions
        .filter((s) => s.day === TODAY && s.status !== 'cancelled')
        .sort((a, b) => a.start.localeCompare(b.start)),
    [sessions],
  );

  const named = (id: string | null) => {
    if (id === OPERATOR_ID) return 'Ismail, at the dashboard';
    const s = staff.find((x) => x.id === id);
    return s ? `${s.forename} ${s.surname}` : 'nobody';
  };

  /* Sessions that have run and were never registered — computed from the
     sessions, not only from the register rows, because a session nobody
     touched has no row at all. */
  const missing = today.filter(
    (s) => hasRun(s) && !registerFor(registers, s.id)?.takenBy,
  );
  const open = unclosed(registers);
  const allAbsent = registers.flatMap((r) =>
    absentees(r).map((id) => ({ id, sessionId: r.sessionId })),
  );

  const tabs: { id: View; label: string }[] = [
    { id: 'today', label: `Today ${today.length}` },
    { id: 'gaps', label: `Not taken ${missing.length}` },
    { id: 'absent', label: `Not there ${allAbsent.length}` },
    { id: 'devices', label: 'On the phones' },
  ];

  const sel = openSession ? today.find((s) => s.id === openSession) : null;

  return (
    <>
      <SectionHead
        title="Attendance"
        /* Counted against the sessions that have actually STARTED, not
           against the register rows that happen to exist — "4 of 5" beside a
           tab reading "Today 20" is a screen arguing with itself. */
        count={`${today.filter((s) => hasRun(s) && registerFor(registers, s.id)?.takenBy).length} of ${today.filter((s) => hasRun(s)).length} registers taken so far · ${today.length - today.filter((s) => hasRun(s)).length} sessions still to run · ${allAbsent.length} unaccounted for`}
      />

      <Lede>
        The register is the spine. Without it you cannot show a ratio was met
        in practice rather than on paper, and you cannot answer the only
        question that matters when somebody is missing — when did anyone last
        see them. Every activity guide tells a leader to count out and count
        back; this is where those counts land.
      </Lede>

      {missing.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 12 }}>
          {missing.length} session{missing.length === 1 ? '' : 's'} ran today
          with no register at all
        </p>
      )}
      {open.length > 0 && (
        <p className="mark mark--overdue" style={{ marginBottom: 22 }}>
          {open.length} groups were counted out and never counted back. That is
          worse than an untaken register, because it looks finished.
        </p>
      )}

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}

      <div className="tabs" role="tablist" aria-label="Attendance view">
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

      {view === 'devices' && <Devices />}

      {view === 'absent' && (
        allAbsent.length === 0 ? (
          <p className="meta reminders__empty">Everybody was where they should be.</p>
        ) : (
          <div className="tablewrap">
            <table className="reg">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Student</th>
                  <th>Group</th>
                  <th>Missed</th>
                  <th>At</th>
                  <th>Marked by</th>
                  <th />
                </tr>
              </thead>
              <tbody className="stagger">
                {allAbsent.map(({ id, sessionId }) => {
                  const s = students.find((x) => x.id === id);
                  const sess = sessions.find((x) => x.id === sessionId);
                  const reg = registerFor(registers, sessionId);
                  if (!s || !sess) return null;
                  return (
                    <tr key={`${id}-${sessionId}`}>
                      <td>
                        <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                          {s.forename} {s.surname}
                        </button>
                      </td>
                      <td>{groupById(s.groupId).name}</td>
                      <td>{activityById(sess.activityId).name}</td>
                      <td className="num">{sess.start}</td>
                      <td className="meta">
                        {named(reg?.takenBy ?? null)}
                        <span style={{ display: 'block', color: 'var(--ink-3)' }}>
                          {reg?.device === 'phone' ? 'from the staff app' : 'from the dashboard'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn" onClick={() => setOpenSession(sessionId)}>
                          Open register
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {(view === 'today' || view === 'gaps') && (
        <ul className="regs stagger">
          {/* A row the user has open stays visible even once it stops being a
              gap — taking a register should show the result, not make the row
              disappear from under the cursor. */}
          {(view === 'gaps'
            ? [
                ...missing,
                ...(openSession && !missing.some((m) => m.id === openSession)
                  ? today.filter((s) => s.id === openSession)
                  : []),
              ]
            : today
          ).map((session) => {
            const reg = registerFor(registers, session.id);
            const roll = rollFor(session, students);
            const isOpen = openSession === session.id;
            const gone = absentees(reg).length;
            return (
              <li key={session.id} className="regrow">
                <button
                  className="regrow__head"
                  onClick={() => setOpenSession(isOpen ? null : session.id)}
                  aria-expanded={isOpen}
                >
                  <span className="regrow__time num">{session.start}</span>
                  <span className="regrow__what">
                    <span className="regrow__act">
                      {activityById(session.activityId).name}
                    </span>
                    <span className="meta">
                      {groupById(session.groupId).name} · {roll.length} on the roll
                    </span>
                  </span>
                  <span className="regrow__count meta num">
                    {reg?.takenBy
                      ? `${counted(reg)} counted`
                      : hasRun(session)
                      ? 'not counted'
                      : `starts ${session.start}`}
                  </span>
                  <span className="regrow__marks">
                    {gone > 0 && <span className="mark mark--critical">{gone} not there</span>}
                    {!hasRun(session) ? (
                      <span className="mark mark--idle">Not yet</span>
                    ) : !reg?.takenBy ? (
                      <span className="mark mark--critical">No register</span>
                    ) : !reg.closedBy ? (
                      <span className="mark mark--overdue">Not counted back</span>
                    ) : (
                      <span className="mark mark--clear">Complete</span>
                    )}
                    {reg?.takenBy && (
                      <span className={`device device--${reg.device}`}>
                        {reg.device === 'phone' ? 'app' : 'web'}
                      </span>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <RegisterSheet
                    session={session}
                    reg={reg}
                    onStudent={setOpenStudent}
                    canEdit={role.canEditRecords}
                    onTake={() => takeRegister(session.id)}
                    onClose={() => closeRegister(session.id)}
                    onMark={(sid, m) => markOne(session.id, sid, m)}
                    named={named}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {view === 'today' && today.length === 0 && (
        <p className="meta reminders__empty">
          No sessions today — {fmtDateLong(TODAY)} is a changeover day.
        </p>
      )}

      {sel && view !== 'today' && view !== 'gaps' && null}
    </>
  );
}

function RegisterSheet({
  session,
  reg,
  onStudent,
  canEdit,
  onTake,
  onClose,
  onMark,
  named,
}: {
  session: Session;
  reg: Register | null;
  onStudent: (id: string) => void;
  canEdit: boolean;
  onTake: () => void;
  onClose: () => void;
  onMark: (studentId: string, m: Mark) => void;
  named: (id: string | null) => string;
}) {
  const { students } = useStore();
  const roll = rollFor(session, students);

  return (
    <div className="sheet2">
      {!reg?.takenBy ? (
        <div className={`sheet2__empty${hasRun(session) ? '' : ' sheet2__empty--soon'}`}>
          <p className="label">
            {hasRun(session) ? 'No register for this session' : 'Not started yet'}
          </p>
          <p className="meta" style={{ maxWidth: '60ch' }}>
            {hasRun(session)
              ? 'It ran at ' + session.start + ' and nobody counted. Take it now from the roll below, or ask the leader to take it on their phone — whichever happens, it has to be somebody who was actually there.'
              : 'This session starts at ' + session.start + '. The leader takes the register at the activity, not from here — this is the roll they will see.'}
          </p>
          <button
            className="btn btn--primary"
            disabled={!canEdit || !hasRun(session)}
            onClick={onTake}
          >
            <IconCheck />
            Mark everyone present and start
          </button>
        </div>
      ) : (
        <p className="meta sheet2__by">
          Taken by {named(reg.takenBy)} at {reg.takenAt?.slice(11)}{' '}
          {reg.device === 'phone' ? 'on the staff app' : 'on the dashboard'}
          {reg.closedBy
            ? ` · counted back at ${reg.closedAt?.slice(11)}`
            : ' · never counted back'}
        </p>
      )}

      <div className="marks">
        {roll.map((s) => {
          const m = reg?.marks[s.id];
          return (
            <div key={s.id} className={`marks__row${m === 'absent' ? ' marks__row--gone' : ''}`}>
              <button className="namebtn marks__name" onClick={() => onStudent(s.id)}>
                {s.forename} {s.surname}
              </button>
              <div className="marks__set" role="group" aria-label={`Mark ${s.forename}`}>
                {(['present', 'late', 'excused', 'absent'] as Mark[]).map((k) => (
                  <button
                    key={k}
                    className={`markbtn${m === k ? ` markbtn--on markbtn--${k}` : ''}`}
                    disabled={!canEdit}
                    title={MARK_COPY[k].label}
                    onClick={() => onMark(s.id, k)}
                  >
                    {MARK_COPY[k].short}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {reg?.takenBy && !reg.closedBy && (
        <div className="editor__actions">
          <button className="btn btn--primary" disabled={!canEdit} onClick={onClose}>
            <IconCheck />
            Counted back — close the register
          </button>
          <span className="meta">
            The count that matters is the one on the way back.
          </span>
        </div>
      )}
    </div>
  );
}

function Devices() {
  const { registers, staff } = useStore();
  const fromPhone = registers.filter((r) => r.device === 'phone' && r.takenBy);
  const fromWeb = registers.filter((r) => r.device === 'dashboard' && r.takenBy);
  const leaders = Array.from(
    new Set(registers.filter((r) => r.takenBy).map((r) => r.takenBy!)),
  );

  return (
    <>
      <div className="split">
        <span>
          <span className="split__n num">{fromPhone.length}</span>
          <span className="meta">registers taken on a phone</span>
        </span>
        <span>
          <span className="split__n num">{fromWeb.length}</span>
          <span className="meta">taken on this dashboard</span>
        </span>
        <span>
          <span className="split__n num">{leaders.length}</span>
          <span className="meta">staff taking them</span>
        </span>
      </div>

      <div className="alert alert--critical">
        <p className="label">The phones are not connected</p>
        <p className="meta" style={{ margin: 0, maxWidth: '68ch' }}>
          A register is taken standing on a field, not at a desk, so it belongs
          on the staff app — native iOS and Android against the same API, which
          is what PRODUCT.md scopes and what does not exist yet. Neither does
          the API. The marks above carry the device they came from so the shape
          is real and testable, but <strong>nothing syncs between devices in
          this demonstration</strong>. Do not describe it as live.
        </p>
      </div>

      <p className="label">What the app half has to do</p>
      <ol className="steps">
        {[
          'Work with no signal. A field, a coach, a basement sports hall — the register is taken there and syncs when it can, or it is useless.',
          'Open on the right session without being told. A leader at 09:00 should see their 09:00 group, not a menu.',
          'Count in under thirty seconds for thirty students. Everyone present by default; you tap the exceptions.',
          'Refuse to close a register the leader did not take. The name on it is a safeguarding record, not a convenience.',
          'Push the second count. The one on the way back is the one that matters, and it is the one people forget.',
        ].map((line, i) => (
          <li key={i}>
            <span className="steps__n num">{i + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <p className="label">Who would be marking</p>
      <ul className="log">
        {leaders.slice(0, 8).map((id) => {
          const s = staff.find((x) => x.id === id);
          const mine = registers.filter((r) => r.takenBy === id);
          return (
            <li key={id}>
              {s ? `${s.forename} ${s.surname}` : id}
              <span className="meta">
                {' '}
                · {mine.length} register{mine.length === 1 ? '' : 's'} today ·{' '}
                {mine.filter((r) => r.device === 'phone').length} on a phone
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
