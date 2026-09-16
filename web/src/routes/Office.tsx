/* ── Head office ──────────────────────────────────────────────────────────
   Every other screen in this platform is a centre looking at its own day.
   This one is the senior team looking down at every centre at once, and it
   exists because of DECISIONS 0005: the clinical record is declared at the
   centre's front door and verified by head office, so head office needs
   somewhere to do that work rather than a spreadsheet and an inbox.

   Four jobs, which is all head office actually does with this data:

   - Verify what families have declared, oldest first, before the child
     arrives rather than after.
   - Chase the medication the centre is holding with no consent to give it.
   - Know the clinical load across the season: how many adrenaline plans, on
     which weeks, at which centre, so the right people are trained and on.
   - Answer "who read this child's medical record", which is the question
     that follows any complaint about special category data.

   It is deliberately not a second copy of the centre's screens. Anything
   operational — a register, a rota, a transfer — stays where the centre
   works, and head office opens the student record if it needs the detail.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { IconArrow, IconCheck } from '../lib/icons';
import { useStore } from '../lib/store';
import { SITES } from '../data/centre';
import {
  HEALTH_COPY, SEVERITY_COPY, dueToday, missedDoses, type Health,
} from '../data/health';
import { waitingOnThem, waitingOnUs } from '../data/portal';
import {
  DEMO_TODAY, daysFromToday, fmtDate, fmtDateLong, fmtMoney, isOnSite,
} from '../data/seed';

type View = 'centres' | 'verify' | 'consent' | 'load' | 'access';

/* Head office is judged on how long a declaration sat, not on how many it
   cleared. Anything older than this has been waiting too long. */
const SLOW_DAYS = 7;

export function Office() {
  const {
    students, staff, health, administrations, audit, reminders, open, incidents,
    requests, payments, registers, bookings, verifyHealth, queryHealth, role,
  } = useStore();

  const [view, setView] = useState<View>('centres');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const named = (id: string) => students.find((s) => s.id === id);

  /* Waiting on head office: declared or queried, oldest first. A record for a
     child who is already here is worse than one for a child who arrives in
     three weeks, so arrival breaks the tie. */
  const toVerify = useMemo(
    () =>
      health
        .filter((h) => h.state !== 'verified')
        .sort((a, b) => {
          const sa = named(a.studentId);
          const sb = named(b.studentId);
          const here = Number(sb ? isOnSite(sb) : false) - Number(sa ? isOnSite(sa) : false);
          return here || a.declaredAt.localeCompare(b.declaredAt);
        }),
    [health, students],
  );

  const waited = (h: Health) => -daysFromToday(h.declaredAt);
  const slow = toVerify.filter((h) => waited(h) > SLOW_DAYS);

  const noConsent = useMemo(
    () =>
      health.flatMap((h) =>
        h.medications
          .filter((m) => !m.consent)
          .map((m) => ({ health: h, medication: m })),
      ),
    [health],
  );

  /* The clinical load, which is a staffing question before it is a medical
     one: somebody trained has to be on site every hour a child with an
     adrenaline plan is. */
  const load = useMemo(() => {
    const onSite = health.filter((h) => {
      const s = named(h.studentId);
      return s ? isOnSite(s) : false;
    });
    const severe = onSite.filter((h) =>
      h.allergies.some((a) => a.severity === 'anaphylaxis'),
    );
    const held = onSite.filter((h) =>
      h.medications.some((m) => m.holder === 'staff-held'),
    );
    const rounds = onSite.reduce((n, h) => n + dueToday(h).length, 0);
    return { onSite, severe, held, rounds };
  }, [health, students]);

  const missed = missedDoses(administrations);

  /* Who opened a clinical record, from the same audit trail everything else
     writes to. */
  const reads = audit.filter((a) => a.action === 'Welfare record opened');

  const tabs: { id: View; label: string }[] = [
    { id: 'centres', label: `Centres ${SITES.filter((s) => s.onboarded).length}` },
    { id: 'verify', label: `To verify ${toVerify.length}` },
    { id: 'consent', label: `Consent ${noConsent.length}` },
    { id: 'load', label: 'Clinical load' },
    { id: 'access', label: `Who read what ${reads.length}` },
  ];

  return (
    <>
      <SectionHead
        title="Head office"
        count={`${SITES.filter((s) => s.onboarded).length} of ${SITES.length} centres live · ${toVerify.length} records to verify · ${slow.length} waiting over ${SLOW_DAYS} days`}
      />

      <p className="meta section__lede">
        The senior team&rsquo;s view, not a centre&rsquo;s. Head office owns
        what the clinical record says — the centre reads it and records what it
        gave — so verifying, querying and chasing consent happen here. Nothing
        operational is duplicated: open a student for the rest of their record.
      </p>

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}

      <div className="tabs" role="tablist" aria-label="Head office view">
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

      {slow.length > 0 && view !== 'access' && (
        <div className="alert alert--critical">
          <p className="label">
            {slow.length} declarations have waited more than {SLOW_DAYS} days
          </p>
          <p className="meta">
            A record nobody has verified is a record the centre is told not to
            act on. Until it is signed off, a child with a declared allergy is
            being supervised on information rather than instruction.
          </p>
        </div>
      )}

      {view === 'centres' && (
        <>
          {SITES.map((site) => {
            const live = site.onboarded;
            const mine = live ? students : [];
            const here = mine.filter((s) => isOnSite(s));
            const unverified = live
              ? health.filter((h) => h.state !== 'verified').length
              : 0;
            const overdue = live
              ? open.filter((r) => r.severity === 'safeguarding').length
              : 0;
            return (
              <section key={site.id} className="slab" style={{ marginBottom: 16 }}>
                <div className="slab__head">
                  <h2 className="slab__title">
                    {site.name}
                    <span className="meta" style={{ marginLeft: 8, color: 'var(--ink-3)' }}>
                      {site.town} · {site.director}
                    </span>
                  </h2>
                  {live ? (
                    <span className="mark mark--clear">Live</span>
                  ) : (
                    <span className="mark mark--idle">Not onboarded</span>
                  )}
                </div>

                {live ? (
                  <div className="figs">
                    <span className="fig">
                      <span className="fig__n num">{here.length}</span>
                      <span className="fig__label">on site</span>
                      <span className="fig__note meta">
                        {mine.length} booked this season
                      </span>
                    </span>
                    <span className={`fig${unverified ? ' fig--alarm' : ''}`}>
                      <span className="fig__n num">{unverified}</span>
                      <span className="fig__label">records to verify</span>
                      <span className="fig__note meta">
                        {slow.length} over {SLOW_DAYS} days
                      </span>
                    </span>
                    <span className={`fig${overdue ? ' fig--alarm' : ''}`}>
                      <span className="fig__n num">{overdue}</span>
                      <span className="fig__label">safeguarding open</span>
                      <span className="fig__note meta">
                        of {open.length} outstanding
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">
                        {incidents.filter((i) => i.status === 'open').length}
                      </span>
                      <span className="fig__label">incidents open</span>
                      <span className="fig__note meta">
                        {incidents.filter((i) => i.level === 'notifiable').length} notifiable this season
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">{waitingOnThem(requests).length}</span>
                      <span className="fig__label">documents chased</span>
                      <span className="fig__note meta">
                        {waitingOnUs(requests).length} waiting on us
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">
                        {fmtMoney(
                          payments
                            .filter((p) => !p.studentId)
                            .reduce((n, p) => n + p.amountPence, 0),
                        )}
                      </span>
                      <span className="fig__label">unmatched</span>
                      <span className="fig__note meta">
                        {payments.filter((p) => !p.studentId).length} payments
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="meta">
                    Capacity {site.capacity}. Contracted and configured, with no
                    records imported yet — so there is nothing to report rather
                    than a page of zeros dressed as a season. It appears here in
                    full the day its spreadsheets are imported.
                  </p>
                )}

                {live && (
                  <p className="meta slab__more">
                    {staff.length} staff ·{' '}
                    {staff.filter((x) => x.dbs.state !== 'cleared').length} without a
                    cleared DBS ·{' '}
                    {registers.filter((r) => !r.takenBy).length} register
                    {registers.filter((r) => !r.takenBy).length === 1 ? '' : 's'} not
                    taken today · {bookings.filter((b) => !b.receipt).length} bookings
                    without a receipt
                  </p>
                )}
              </section>
            );
          })}
        </>
      )}

      {view === 'verify' && (
        toVerify.length === 0 ? (
          <p className="meta reminders__empty">
            Every declared record has been verified. Nothing is waiting on head
            office.
          </p>
        ) : (
          <ul className="reqs stagger">
            {toVerify.map((h) => {
              const s = named(h.studentId);
              if (!s) return null;
              const days = waited(h);
              const worst = h.allergies.find((a) => a.severity === 'anaphylaxis');
              return (
                <li key={h.studentId} className="req">
                  <div className="req__head">
                    <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                      {HEALTH_COPY[h.state].label}
                    </span>
                    <button
                      className="namebtn req__who"
                      onClick={() => setOpenStudent(s.id)}
                    >
                      {s.forename} {s.surname}
                    </button>
                    <span className="req__what">
                      {s.age} · {s.country} ·{' '}
                      {isOnSite(s) ? 'on site now' : `arrives ${fmtDate(s.arrival)}`}
                    </span>
                    <span className="meta req__when">
                      {h.source === 'booking'
                        ? 'declared with the booking'
                        : 'entered by head office'}{' '}
                      · waiting {days} day{days === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="meta req__next">
                    {[
                      ...h.allergies.map(
                        (a) => `${a.what} (${SEVERITY_COPY[a.severity].label.toLowerCase()})`,
                      ),
                      ...h.medications.map((m) => `${m.name} ${m.dose}`),
                    ].join(' · ')}
                  </p>
                  {worst && (
                    <p className="meta req__next">
                      {worst.treatment} Auto-injector: {worst.keptWhere ?? 'not recorded'}.
                    </p>
                  )}
                  {h.query && <p className="meta req__reason">Queried: {h.query}</p>}

                  {role.welfareEdit ? (
                    asking === h.studentId ? (
                      <div className="req__actions">
                        <input
                          className="field"
                          value={reason}
                          placeholder="What does not add up?"
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <button
                          className="btn btn--primary"
                          disabled={reason.trim().length < 4}
                          onClick={() => {
                            queryHealth(h.studentId, reason.trim());
                            setReason('');
                            setAsking(null);
                          }}
                        >
                          Send the query
                        </button>
                        <button className="btn" onClick={() => setAsking(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="req__actions">
                        <button
                          className="btn btn--primary"
                          onClick={() => verifyHealth(h.studentId)}
                        >
                          <IconCheck />
                          Verify
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            setAsking(h.studentId);
                            setReason('');
                          }}
                        >
                          Query with the family
                        </button>
                        <button className="btn" onClick={() => setOpenStudent(s.id)}>
                          Open the record
                          <IconArrow />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="meta">
                      {role.name} can see this queue but not clear it. Verifying
                      belongs to head office welfare.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {view === 'consent' && (
        noConsent.length === 0 ? (
          <p className="meta reminders__empty">
            Everything the centres hold has written consent behind it.
          </p>
        ) : (
          <>
            <p className="meta section__lede">
              Medication a centre is holding with no signed consent to give it.
              Nobody may administer any of it, however obvious the need, so
              these are chased before arrival rather than argued about at 22:00
              on a Saturday.
            </p>
            <div className="tablewrap">
              <table className="reg">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Medication</th>
                    <th>Held by</th>
                    <th>Arrives</th>
                    <th>Guardian</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody className="stagger">
                  {noConsent.map(({ health: h, medication: m }) => {
                    const s = named(h.studentId);
                    if (!s) return null;
                    return (
                      <tr key={m.id}>
                        <td>
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                        </td>
                        <td>
                          {m.name}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {m.dose} · {m.route}
                          </span>
                        </td>
                        <td className="meta">
                          {m.holder === 'staff-held' ? 'The centre' : 'The student'}
                        </td>
                        <td className="num">{fmtDate(s.arrival)}</td>
                        <td>
                          {s.guardian.name}
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.guardian.phone}
                          </span>
                        </td>
                        <td>
                          <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                            {HEALTH_COPY[h.state].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {view === 'load' && (
        <>
          <div className="figs">
            <span className="fig">
              <span className="fig__n num">{load.onSite.length}</span>
              <span className="fig__label">children with a record on site</span>
              <span className="fig__note meta">of {health.length} this season</span>
            </span>
            <span className={`fig${load.severe.length ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{load.severe.length}</span>
              <span className="fig__label">adrenaline plans on site</span>
              <span className="fig__note meta">
                somebody trained has to be on every hour
              </span>
            </span>
            <span className="fig">
              <span className="fig__n num">{load.held.length}</span>
              <span className="fig__label">holding medication for the centre</span>
              <span className="fig__note meta">locked storage and a named holder</span>
            </span>
            <span className="fig">
              <span className="fig__n num">{load.rounds}</span>
              <span className="fig__label">doses due today</span>
              <span className="fig__note meta">across every centre</span>
            </span>
            <span className={`fig${missed.length ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{missed.length}</span>
              <span className="fig__label">doses unrecorded</span>
              <span className="fig__note meta">due and never signed either way</span>
            </span>
            <span className="fig">
              <span className="fig__n num">
                {health.filter((h) => h.source === 'booking').length}
              </span>
              <span className="fig__label">declared at booking</span>
              <span className="fig__note meta">
                {health.filter((h) => h.source === 'senior').length} typed up here
              </span>
            </span>
          </div>

          <p className="label">Adrenaline plans, and when they are here</p>
          {load.severe.length === 0 ? (
            <p className="meta">Nobody on site has an adrenaline plan today.</p>
          ) : (
            <div className="tablewrap">
              <table className="reg">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Allergy</th>
                    <th>Pen kept</th>
                    <th>On site until</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {load.severe.map((h) => {
                    const s = named(h.studentId)!;
                    const a = h.allergies.find((x) => x.severity === 'anaphylaxis')!;
                    return (
                      <tr key={h.studentId}>
                        <td>
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.age} · {s.band}
                          </span>
                        </td>
                        <td>
                          {a.what}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {a.reaction}
                          </span>
                        </td>
                        <td className="meta">{a.keptWhere ?? 'Not recorded'}</td>
                        <td className="num">{fmtDate(s.leaving)}</td>
                        <td>
                          <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                            {HEALTH_COPY[h.state].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'access' && (
        <>
          <p className="meta section__lede">
            Every opening of a child&rsquo;s medication and allergy record, with
            who opened it and under which role. This is the answer to the
            question that follows any complaint about special category data, and
            it is written by the platform rather than by the person reading.
          </p>
          {reads.length === 0 ? (
            <p className="meta reminders__empty">
              Nobody has opened a clinical record in this session.
            </p>
          ) : (
            <ul className="log">
              {reads.map((a) => (
                <li key={a.id}>
                  <strong>{a.subject}</strong>
                  <span className="meta" style={{ display: 'block' }}>
                    {a.at} · {a.actor} · {a.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="meta slab__more">
            The reminder queue, the audit trail and this log are the same
            records read three ways. Deleting an entry is not possible here or
            anywhere else — an audit trail that can be edited is not one.
          </p>
        </>
      )}
    </>
  );
}
